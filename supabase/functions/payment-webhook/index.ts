// Supabase Edge Function: payment provider callback (Deno runtime)
// Deploy with: supabase functions deploy payment-webhook --no-verify-jwt
// (The provider calls it server-to-server without a user JWT; the provider adapter
// verifies the callback's signature instead.)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaymentProvider } from '../_shared/payment-provider.ts';
import { handlePaymentWebhook, RejectedError, type WebhookRepo } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.');
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const repo: WebhookRepo = {
  async record(providerId, result) {
    const { data, error } = await db.rpc('qareeb_record_provider_payment', {
      p_attempt_id: result.attemptId,
      p_provider: providerId,
      p_provider_ref: result.providerRef,
      p_amount: result.amount,
      p_currency: result.currency,
      p_success: result.success,
      p_reason: result.reason ?? null,
    });
    if (error) {
      // Unknown attempt, other provider, mismatched or reused reference: retrying cannot help
      if (['P0002', '22023', '23505', '22P02'].includes(error.code)) throw new RejectedError(error.message);
      throw error;
    }
    return data as string;
  },
};

Deno.serve((req) => handlePaymentWebhook(req, repo, getPaymentProvider()));
