// Tests for the send-sms Auth Hook. No network calls: fetch is stubbed, so no SMS is sent.
// Run: deno test --allow-env supabase/functions/send-sms/send-sms_test.ts
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { handleSendSmsHook, getAdapter } from './handler.ts';
import { SendPKAdapter } from './adapters/sendpk.ts';
import { DevLogAdapter, toPakistaniMsisdn } from './adapters/devlog.ts';

const ENV_KEYS = [
  'SEND_SMS_HOOK_SECRET', 'AUTH_HOOK_SECRET', 'SMS_PROVIDER', 'SMS_DEV_ALLOWED_PHONES',
  'SENDPK_API_KEY', 'SENDPK_TEMPLATE_ID', 'SENDPK_OTP_VARIABLE', 'SENDPK_USERNAME', 'SENDPK_PASSWORD', 'SENDPK_SENDER_ID',
  'VEEVO_HASH', 'AISMS_API_KEY',
];
const realFetch = globalThis.fetch;

function setEnv(values: Record<string, string>) {
  for (const k of ENV_KEYS) Deno.env.delete(k);
  for (const [k, v] of Object.entries(values)) Deno.env.set(k, v);
}

function assertEquals(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

/** Captures outgoing fetch URLs and returns a canned provider response. */
function stubFetch(body: string, status = 200): string[] {
  const calls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return Promise.resolve(new Response(body, { status }));
  }) as typeof fetch;
  return calls;
}

// Test-only signing key generated per run (not a real hook secret)
const SECRET_B64 = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const HOOK_SECRET = `v1,whsec_${SECRET_B64}`;

function hookRequest(payload: unknown, opts: { sign?: boolean; tamper?: boolean } = { sign: true }): Request {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.sign) {
    const id = `msg_${crypto.randomUUID()}`;
    const ts = new Date();
    headers['webhook-id'] = id;
    headers['webhook-timestamp'] = String(Math.floor(ts.getTime() / 1000));
    headers['webhook-signature'] = new Webhook(SECRET_B64).sign(id, ts, body);
  }
  const sent = opts.tamper ? body.replace('923001234567', '923009999999') : body;
  return new Request('http://localhost/send-sms', { method: 'POST', headers, body: sent });
}

const PAYLOAD = { user: { id: 'u1', phone: '923001234567' }, sms: { otp: '482913' } };

async function run(req: Request) {
  const res = await handleSendSmsHook(req);
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ---------- Hook security ----------

Deno.test('fails closed when SEND_SMS_HOOK_SECRET is not configured', async () => {
  setEnv({});
  const calls = stubFetch('OK ID:1');
  const r = await run(hookRequest(PAYLOAD, { sign: false }));
  assertEquals(r.status, 500);
  assert(/SEND_SMS_HOOK_SECRET/.test(r.body.error.message), 'error should name the missing secret');
  assertEquals(calls.length, 0, 'no provider call');
  globalThis.fetch = realFetch;
});

Deno.test('rejects unsigned, forged and tampered requests', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'sendpk', SENDPK_API_KEY: 'k', SENDPK_TEMPLATE_ID: 't' });
  const calls = stubFetch('OK ID:1');
  assertEquals((await run(hookRequest(PAYLOAD, { sign: false }))).status, 401, 'unsigned');
  const forged = hookRequest(PAYLOAD);
  forged.headers.set('webhook-signature', 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  assertEquals((await run(forged)).status, 401, 'forged');
  assertEquals((await run(hookRequest(PAYLOAD, { sign: true, tamper: true }))).status, 401, 'tampered');
  assertEquals(calls.length, 0, 'no provider call for rejected requests');
  globalThis.fetch = realFetch;
});

Deno.test('method handling and payload validation', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET });
  assertEquals((await run(new Request('http://localhost/', { method: 'GET' }))).status, 405);
  assertEquals((await handleSendSmsHook(new Request('http://localhost/', { method: 'OPTIONS' }))).status, 200);
  const r = await run(hookRequest({ user: { id: 'u1' }, sms: {} }));
  assertEquals(r.status, 400);
});

// ---------- SendPK (production provider) ----------

Deno.test('SendPK: signed hook sends api_key + template request and returns 200 on "OK ID"', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'sendpk', SENDPK_API_KEY: 'test-key', SENDPK_TEMPLATE_ID: 'tpl-1', SENDPK_SENDER_ID: '8584' });
  const calls = stubFetch('OK ID:29346');
  const r = await run(hookRequest(PAYLOAD));
  assertEquals(r.status, 200);
  assertEquals(r.body, {});
  assertEquals(calls.length, 1);
  const q = new URL(calls[0]).searchParams;
  assertEquals(new URL(calls[0]).origin + new URL(calls[0]).pathname, 'https://sendpk.com/api/sms.php');
  assertEquals(q.get('api_key'), 'test-key');
  assertEquals(q.get('template_id'), 'tpl-1');
  assertEquals(q.get('sender'), '8584');
  assertEquals(q.get('mobile'), '923001234567');
  assertEquals(q.get('message'), '{"otp":"482913"}');
  globalThis.fetch = realFetch;
});

Deno.test('SendPK: provider errors are reported as failures (never as sent)', async () => {
  setEnv({ SENDPK_API_KEY: 'k', SENDPK_TEMPLATE_ID: 't' });
  const adapter = new SendPKAdapter();
  for (const body of ['1', '2', '8', '9', '12 Request rejected', 'token expired', '']) {
    stubFetch(body);
    const r = await adapter.send('+923001234567', '111111');
    assert(!r.success, `body ${JSON.stringify(body)} must not count as sent`);
  }
  stubFetch('Server error', 500);
  assert(!(await adapter.send('+923001234567', '111111')).success, 'HTTP 500 must fail');
  globalThis.fetch = realFetch;
});

Deno.test('SendPK: missing configuration fails without calling the provider', async () => {
  const calls = stubFetch('OK ID:1');
  setEnv({});
  let r = await new SendPKAdapter().send('+923001234567', '1');
  assert(!r.success && /SENDPK_API_KEY/.test(r.error!), 'no credentials');
  setEnv({ SENDPK_API_KEY: 'k' });
  r = await new SendPKAdapter().send('+923001234567', '1');
  assert(!r.success && /SENDPK_TEMPLATE_ID/.test(r.error!), 'api key without template');
  assertEquals(calls.length, 0);
  globalThis.fetch = realFetch;
});

Deno.test('SendPK: hook returns 500 with the provider error when sending fails', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'sendpk', SENDPK_API_KEY: 'k', SENDPK_TEMPLATE_ID: 't' });
  stubFetch('8');
  const r = await run(hookRequest(PAYLOAD));
  assertEquals(r.status, 500);
  assert(/SendPK error: 8/.test(r.body.error.message), 'provider error surfaced');
  globalThis.fetch = realFetch;
});

// ---------- Provider selection ----------

Deno.test('provider selection defaults to SendPK; devlog only when explicit', () => {
  setEnv({});
  assert(getAdapter() instanceof SendPKAdapter, 'default is SendPK');
  setEnv({ SMS_PROVIDER: 'something-unknown' });
  assert(getAdapter() instanceof SendPKAdapter, 'unknown value falls back to SendPK, not devlog');
  setEnv({ SMS_PROVIDER: 'devlog' });
  assert(getAdapter() instanceof DevLogAdapter, 'devlog when explicitly selected');
});

// ---------- Dev log mode ----------

Deno.test('devlog: phone formatting for allowlist comparison', () => {
  for (const input of ['03001234567', '+923001234567', '923001234567', '00923001234567', '3001234567', '0300-123 4567']) {
    assertEquals(toPakistaniMsisdn(input), '923001234567', input);
  }
});

Deno.test('devlog: refuses when no test numbers are configured', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'devlog' });
  const calls = stubFetch('OK ID:1');
  const r = await run(hookRequest(PAYLOAD));
  assertEquals(r.status, 500);
  assert(/SMS_DEV_ALLOWED_PHONES/.test(r.body.error.message), 'names the missing allowlist');
  assertEquals(calls.length, 0, 'never calls a provider');
  globalThis.fetch = realFetch;
});

Deno.test('devlog: non-test numbers get an explicit "no SMS was sent" error', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'devlog', SMS_DEV_ALLOWED_PHONES: '03110000000' });
  const calls = stubFetch('OK ID:1');
  const r = await run(hookRequest(PAYLOAD));
  assertEquals(r.status, 500);
  assert(/No SMS was sent/.test(r.body.error.message), 'says no SMS was sent');
  assertEquals(calls.length, 0);
  globalThis.fetch = realFetch;
});

Deno.test('devlog: allowlisted number logs the real OTP, sends nothing, reports no message id', async () => {
  setEnv({ SEND_SMS_HOOK_SECRET: HOOK_SECRET, SMS_PROVIDER: 'devlog', SMS_DEV_ALLOWED_PHONES: '03110000000, 03001234567' });
  const calls = stubFetch('OK ID:1');
  const logs: string[] = [];
  const realLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  try {
    const r = await run(hookRequest(PAYLOAD));
    assertEquals(r.status, 200);
    const devLine = logs.find((l) => l.includes('DEV LOG MODE'));
    assert(devLine && devLine.includes('NO SMS WAS SENT') && devLine.includes('482913'), 'log states no SMS sent and holds the OTP');
    assert(!logs.some((l) => /MessageId: (?!none)/.test(l)), 'no provider message id reported');
    assertEquals(calls.length, 0, 'no network call');
    const direct = await new DevLogAdapter().send('+923001234567', '482913');
    assertEquals(direct.messageId, undefined);
  } finally {
    console.log = realLog;
    globalThis.fetch = realFetch;
  }
});
