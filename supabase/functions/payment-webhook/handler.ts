// Server-to-server payment result from the provider. Only callbacks whose signature the
// provider adapter verified are applied; the database settles the attempt idempotently,
// so repeated deliveries are safe. The customer's browser is never trusted for this.
import type { PaymentProvider, VerifiedCallback } from '../_shared/payment-provider.ts';

/** Thrown by the repo when the callback refers to something that does not exist or match. */
export class RejectedError extends Error {}

export interface WebhookRepo {
  /** qareeb_record_provider_payment (service role); returns the attempt status. */
  record(providerId: string, result: VerifiedCallback): Promise<string>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handlePaymentWebhook(
  req: Request,
  repo: WebhookRepo,
  provider: PaymentProvider | null,
): Promise<Response> {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }
  if (!provider) {
    console.error('[payment-webhook] No payment provider is configured (PAYMENT_PROVIDER). Callback refused.');
    return json(503, { error: 'Online payments are not configured.' });
  }

  let result: VerifiedCallback | null;
  try {
    result = await provider.verifyCallback(req);
  } catch (err) {
    console.warn(`[payment-webhook] ${provider.id} callback could not be read:`, err instanceof Error ? err.message : err);
    result = null;
  }
  if (!result) {
    console.warn(`[payment-webhook] Rejected a ${provider.id} callback with a missing or invalid signature.`);
    return json(401, { error: 'Invalid signature.' });
  }

  try {
    const status = await repo.record(provider.id, result);
    console.log(`[payment-webhook] ${provider.id} attempt ${result.attemptId}: ${status}`);
    return provider.acknowledge(status);
  } catch (err) {
    if (err instanceof RejectedError) {
      console.warn(`[payment-webhook] ${provider.id} callback for attempt ${result.attemptId} rejected: ${err.message}`);
      return json(400, { error: err.message });
    }
    // Temporary failure: the provider retries and the database ignores duplicates
    console.error(`[payment-webhook] ${provider.id} attempt ${result.attemptId} failed:`, err instanceof Error ? err.message : err);
    return json(500, { error: 'Could not record the payment. Please retry.' });
  }
}
