// Supabase Edge Function: start an online payment (Deno runtime)
// Deploy with JWT verification ON (default): supabase functions deploy payment-checkout
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaymentProvider } from '../_shared/payment-provider.ts';
import { handlePaymentCheckout, RefusedError, type CheckoutRepo, type StartedAttempt } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.');
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const repo: CheckoutRepo = {
  async getCallerId(jwt) {
    const { data, error } = await db.auth.getUser(jwt);
    return error ? null : data.user?.id ?? null;
  },

  async startAttempt(payerId, bookingId, method, providerId) {
    const { data, error } = await db.rpc('qareeb_start_online_payment', {
      p_payer_id: payerId, p_booking_id: bookingId, p_method: method, p_provider: providerId,
    });
    // 42501/22023 are refusals raised by the function with a customer-facing message
    if (error) throw error.code === '42501' || error.code === '22023' ? new RefusedError(error.message) : error;
    const row = (data as StartedAttempt[] | null)?.[0];
    if (!row) throw new Error('qareeb_start_online_payment returned no attempt');
    return row;
  },

  async cancelAttempt(attemptId, note) {
    const { error } = await db.rpc('qareeb_cancel_payment_attempt', { p_attempt_id: attemptId, p_note: note });
    if (error) throw error;
  },
};

Deno.serve((req) => handlePaymentCheckout(req, repo, getPaymentProvider()));
