// Starts an online payment for a completed job. The amount always comes from the
// database (Payments row), never from the app; the provider's secret keys stay here.
import { ONLINE_METHODS, type CheckoutResult, type OnlineMethod, type PaymentProvider } from '../_shared/payment-provider.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StartedAttempt {
  attempt_id: string;
  amount: number;
  currency: string;
  expires_at: string;
}

/** Thrown by the repo for a refusal the customer should see (wrong payer, already paid, ...). */
export class RefusedError extends Error {}

export interface CheckoutRepo {
  getCallerId(jwt: string): Promise<string | null>;
  /** qareeb_start_online_payment (service role) */
  startAttempt(payerId: string, bookingId: string, method: OnlineMethod, providerId: string): Promise<StartedAttempt>;
  /** qareeb_cancel_payment_attempt (service role) */
  cancelAttempt(attemptId: string, note: string): Promise<void>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export async function handlePaymentCheckout(
  req: Request,
  repo: CheckoutRepo,
  provider: PaymentProvider | null,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const callerId = jwt ? await repo.getCallerId(jwt) : null;
  if (!callerId) {
    return json(401, { error: 'Please sign in.' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  const bookingId = body.bookingId;
  const method = body.method;
  if (typeof bookingId !== 'string' || !UUID_RE.test(bookingId)) {
    return json(400, { error: 'A valid bookingId is required.' });
  }
  if (typeof method !== 'string' || !ONLINE_METHODS.includes(method as OnlineMethod)) {
    return json(400, { error: 'method must be Easypaisa, JazzCash or Card.' });
  }

  if (!provider) {
    return json(503, { error: 'Online payments are not available yet. Please pay in cash.' });
  }
  if (!provider.methods.includes(method as OnlineMethod)) {
    return json(400, { error: `${method} is not available. Please choose another payment method.` });
  }

  let attempt: StartedAttempt;
  try {
    attempt = await repo.startAttempt(callerId, bookingId, method as OnlineMethod, provider.id);
  } catch (err) {
    if (err instanceof RefusedError) return json(409, { error: err.message });
    console.error('[payment-checkout] could not start the attempt:', err instanceof Error ? err.message : err);
    return json(500, { error: 'Payment service error. Please try again.' });
  }

  let checkout: CheckoutResult;
  try {
    checkout = await provider.createCheckout({
      attemptId: attempt.attempt_id,
      amount: Number(attempt.amount),
      currency: attempt.currency,
      method: method as OnlineMethod,
      expiresAt: attempt.expires_at,
    });
  } catch (err) {
    console.error(`[payment-checkout] ${provider.id} checkout failed for attempt ${attempt.attempt_id}:`,
      err instanceof Error ? err.message : err);
    try {
      await repo.cancelAttempt(attempt.attempt_id, 'The payment provider could not start the checkout');
    } catch (cancelErr) {
      console.error('[payment-checkout] could not close the attempt:', cancelErr instanceof Error ? cancelErr.message : cancelErr);
    }
    return json(502, { error: 'The payment provider is not responding. Please try again or pay in cash.' });
  }

  return json(200, {
    attemptId: attempt.attempt_id,
    amount: Number(attempt.amount),
    currency: attempt.currency,
    expiresAt: attempt.expires_at,
    ...checkout,
  });
}
