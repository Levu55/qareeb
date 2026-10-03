// Tests for the payment-webhook handler with an in-memory repo and a fake provider
// (test-only: no real provider is integrated). No network, no database.
// Run: deno test --allow-env supabase/functions/payment-webhook/payment-webhook_test.ts
import { handlePaymentWebhook, RejectedError, type WebhookRepo } from './handler.ts';
import type { PaymentProvider, VerifiedCallback } from '../_shared/payment-provider.ts';

function assertEquals(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const ATTEMPT = '66666666-6666-4666-8666-666666666666';
const SECRET = 'test-signing-secret';

// Accepts a callback only when its x-signature header equals SECRET
const provider: PaymentProvider = {
  id: 'fakepay',
  methods: ['JazzCash'],
  createCheckout: () => Promise.reject(new Error('not used')),
  async verifyCallback(req) {
    if (req.headers.get('x-signature') !== SECRET) return null;
    return (await req.json()) as VerifiedCallback;
  },
  acknowledge: (status) => new Response(JSON.stringify({ received: true, status }), { status: 200 }),
};

function makeRepo(fail?: Error) {
  const recorded: { providerId: string; result: VerifiedCallback }[] = [];
  const repo: WebhookRepo = {
    record: (providerId, result) => {
      if (fail) return Promise.reject(fail);
      recorded.push({ providerId, result });
      return Promise.resolve(result.success ? 'Succeeded' : 'Failed');
    },
  };
  return { repo, recorded };
}

const PAID: VerifiedCallback = { attemptId: ATTEMPT, providerRef: 'TXN-1', amount: 1200, currency: 'PKR', success: true };

function call(repo: WebhookRepo, p: PaymentProvider | null, signature: string | null, body: unknown, method = 'POST') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['x-signature'] = signature;
  return handlePaymentWebhook(
    new Request('https://example.test/payment-webhook', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }),
    repo,
    p,
  );
}

Deno.test('refuses callbacks while no provider is configured', async () => {
  const { repo, recorded } = makeRepo();
  assertEquals((await call(repo, null, SECRET, PAID)).status, 503);
  assertEquals(recorded.length, 0);
});

Deno.test('rejects unsigned and wrongly signed callbacks without touching the database', async () => {
  const { repo, recorded } = makeRepo();
  assertEquals((await call(repo, provider, null, PAID)).status, 401);
  assertEquals((await call(repo, provider, 'forged', PAID)).status, 401);
  assertEquals(recorded.length, 0);
});

Deno.test('rejects other HTTP methods', async () => {
  const { repo } = makeRepo();
  assertEquals((await call(repo, provider, SECRET, null, 'GET')).status, 405);
});

Deno.test('records a verified callback and acknowledges it the provider way', async () => {
  const { repo, recorded } = makeRepo();
  const res = await call(repo, provider, SECRET, PAID);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { received: true, status: 'Succeeded' });
  assertEquals(recorded, [{ providerId: 'fakepay', result: PAID }]);
});

Deno.test('answers 400 to callbacks the database rejects (no point retrying)', async () => {
  const { repo } = makeRepo(new RejectedError('Payment attempt not found'));
  assertEquals((await call(repo, provider, SECRET, PAID)).status, 400);
});

Deno.test('answers 500 on a temporary failure so the provider retries', async () => {
  const { repo } = makeRepo(new Error('connection reset'));
  assertEquals((await call(repo, provider, SECRET, PAID)).status, 500);
});
