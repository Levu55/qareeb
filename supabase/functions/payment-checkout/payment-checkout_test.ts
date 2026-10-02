// Tests for the payment-checkout handler with an in-memory repo and a fake provider
// (test-only: no real provider is integrated). No network, no database.
// Run: deno test --allow-env supabase/functions/payment-checkout/payment-checkout_test.ts
import { handlePaymentCheckout, RefusedError, type CheckoutRepo } from './handler.ts';
import type { CheckoutRequest, PaymentProvider } from '../_shared/payment-provider.ts';

function assertEquals(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const CUSTOMER = '22222222-2222-4222-8222-222222222222';
const BOOKING = '55555555-5555-4555-8555-555555555555';
const ATTEMPT = '66666666-6666-4666-8666-666666666666';

function makeRepo(opts: { refuse?: string } = {}) {
  const started: unknown[] = [];
  const cancelled: string[] = [];
  const repo: CheckoutRepo = {
    getCallerId: (jwt) => Promise.resolve(jwt === 'jwt-customer' ? CUSTOMER : null),
    startAttempt: (payerId, bookingId, method, providerId) => {
      if (opts.refuse) return Promise.reject(new RefusedError(opts.refuse));
      started.push({ payerId, bookingId, method, providerId });
      return Promise.resolve({ attempt_id: ATTEMPT, amount: 1200, currency: 'PKR', expires_at: '2026-10-02T12:15:00Z' });
    },
    cancelAttempt: (attemptId) => { cancelled.push(attemptId); return Promise.resolve(); },
  };
  return { repo, started, cancelled };
}

function fakeProvider(opts: { fail?: boolean } = {}) {
  const checkouts: CheckoutRequest[] = [];
  const provider: PaymentProvider = {
    id: 'fakepay',
    methods: ['JazzCash', 'Card'],
    createCheckout: (req) => {
      checkouts.push(req);
      return opts.fail ? Promise.reject(new Error('provider down')) : Promise.resolve({ redirectUrl: `https://pay.example/${req.attemptId}` });
    },
    verifyCallback: () => Promise.resolve(null),
    acknowledge: () => new Response('ok'),
  };
  return { provider, checkouts };
}

function call(repo: CheckoutRepo, provider: PaymentProvider | null, token: string | null, body: unknown, method = 'POST') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return handlePaymentCheckout(
    new Request('https://example.test/payment-checkout', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }),
    repo,
    provider,
  );
}

Deno.test('requires sign-in', async () => {
  const { repo } = makeRepo();
  const res = await call(repo, fakeProvider().provider, null, { bookingId: BOOKING, method: 'JazzCash' });
  assertEquals(res.status, 401);
});

Deno.test('rejects other HTTP methods', async () => {
  const { repo } = makeRepo();
  assertEquals((await call(repo, null, 'jwt-customer', null, 'GET')).status, 405);
});

Deno.test('validates booking id and method', async () => {
  const { repo, started } = makeRepo();
  const { provider } = fakeProvider();
  assertEquals((await call(repo, provider, 'jwt-customer', { bookingId: 'x', method: 'JazzCash' })).status, 400);
  assertEquals((await call(repo, provider, 'jwt-customer', { bookingId: BOOKING, method: 'Cash' })).status, 400);
  assertEquals(started.length, 0, 'no attempt started');
});

Deno.test('answers 503 while no provider is configured, without starting an attempt', async () => {
  const { repo, started } = makeRepo();
  const res = await call(repo, null, 'jwt-customer', { bookingId: BOOKING, method: 'JazzCash' });
  assertEquals(res.status, 503);
  assertEquals((await res.json()).error, 'Online payments are not available yet. Please pay in cash.');
  assertEquals(started.length, 0);
});

Deno.test('refuses a method the provider does not support', async () => {
  const { repo, started } = makeRepo();
  const res = await call(repo, fakeProvider().provider, 'jwt-customer', { bookingId: BOOKING, method: 'Easypaisa' });
  assertEquals(res.status, 400);
  assertEquals(started.length, 0);
});

Deno.test('starts the attempt for the verified caller and returns the checkout', async () => {
  const { repo, started } = makeRepo();
  const { provider, checkouts } = fakeProvider();
  const res = await call(repo, provider, 'jwt-customer', { bookingId: BOOKING, method: 'JazzCash', amount: 1 });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(started, [{ payerId: CUSTOMER, bookingId: BOOKING, method: 'JazzCash', providerId: 'fakepay' }]);
  assertEquals(checkouts[0].amount, 1200, 'amount comes from the database, not the request');
  assertEquals(checkouts[0].attemptId, ATTEMPT);
  assertEquals(body.redirectUrl, `https://pay.example/${ATTEMPT}`);
});

Deno.test('passes database refusals to the customer', async () => {
  const { repo } = makeRepo({ refuse: 'This payment is already paid' });
  const res = await call(repo, fakeProvider().provider, 'jwt-customer', { bookingId: BOOKING, method: 'JazzCash' });
  assertEquals(res.status, 409);
  assertEquals((await res.json()).error, 'This payment is already paid');
});

Deno.test('closes the attempt when the provider cannot create the checkout', async () => {
  const { repo, cancelled } = makeRepo();
  const res = await call(repo, fakeProvider({ fail: true }).provider, 'jwt-customer', { bookingId: BOOKING, method: 'Card' });
  assertEquals(res.status, 502);
  assertEquals(cancelled, [ATTEMPT]);
});
