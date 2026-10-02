// Tests for the SMS helpers and adapter failure handling. fetch is stubbed: no SMS is sent.
// No URL imports, so this file also runs under Node with a Deno.test shim.
// Run: deno test --allow-env supabase/functions/send-sms/adapters/adapters_test.ts
import { isPakistaniMobile, redactSecrets, toPakistaniMsisdn } from './phone.ts';
import { SendPKAdapter } from './sendpk.ts';
import { VeevoTechAdapter } from './veevotech.ts';

function assertEquals(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const realFetch = globalThis.fetch;
const ENV_KEYS = ['SENDPK_API_KEY', 'SENDPK_TEMPLATE_ID', 'SENDPK_USERNAME', 'SENDPK_PASSWORD', 'VEEVO_HASH'];
function useEnv(values: Record<string, string>) {
  for (const k of ENV_KEYS) Deno.env.delete(k);
  for (const [k, v] of Object.entries(values)) Deno.env.set(k, v);
}
function restore() {
  globalThis.fetch = realFetch;
  for (const k of ENV_KEYS) Deno.env.delete(k);
}

Deno.test('Pakistani mobile numbers are accepted in every common format', () => {
  for (const input of ['03001234567', '+923001234567', '923001234567', '00923001234567', '3001234567', '0300-123 4567']) {
    const msisdn = toPakistaniMsisdn(input);
    assertEquals(msisdn, '923001234567', input);
    assert(isPakistaniMobile(msisdn), `${input} should be accepted`);
  }
});

Deno.test('landlines, foreign and malformed numbers are refused', () => {
  for (const input of ['0421234567', '+14155550123', '+447700900123', '92300123456', '9230012345678', '', '923']) {
    assert(!isPakistaniMobile(toPakistaniMsisdn(input)), `${input} must be refused`);
  }
});

Deno.test('redactSecrets strips query strings and masks the OTP', () => {
  const raw = 'error sending request for url (https://sendpk.com/api/sms.php?api_key=SECRET123&mobile=923001234567&message=%7B%22otp%22%3A%22482913%22%7D): timed out; code 482913';
  const safe = redactSecrets(raw, '482913');
  assert(!safe.includes('SECRET123'), 'API key removed');
  assert(!safe.includes('482913'), 'OTP masked');
  assert(safe.includes('https://sendpk.com/api/sms.php'), 'endpoint kept for debugging');
});

Deno.test('SendPK: a network failure is a failure, and its text is safe once redacted', async () => {
  useEnv({ SENDPK_API_KEY: 'SECRET123', SENDPK_TEMPLATE_ID: 't' });
  globalThis.fetch = ((input: string | URL | Request) =>
    Promise.reject(new TypeError(`error sending request for url (${String(input)})`))) as typeof fetch;
  try {
    const r = await new SendPKAdapter().send('923001234567', '482913');
    assert(!r.success, 'must fail');
    const safe = redactSecrets(r.error!, '482913');
    assert(!safe.includes('SECRET123') && !safe.includes('482913'), `leaked: ${safe}`);
  } finally {
    restore();
  }
});

Deno.test('Veevo Tech: only an explicit success counts as sent', async () => {
  useEnv({ VEEVO_HASH: 'h' });
  try {
    for (const [body, ok] of [
      ['{"status":"success","message_id":"9"}', true],
      ['Message sent successfully', true],
      ['{"status":"queued"}', false],
      ['{}', false],
      ['', false],
      ['Message sending unsuccessful', false],
    ] as const) {
      globalThis.fetch = (() => Promise.resolve(new Response(body, { status: 200 }))) as typeof fetch;
      const r = await new VeevoTechAdapter().send('923001234567', '111111');
      assertEquals(r.success, ok, `body ${JSON.stringify(body)}`);
    }
  } finally {
    restore();
  }
});
