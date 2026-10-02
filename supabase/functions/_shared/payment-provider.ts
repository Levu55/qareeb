// Online payment provider interface shared by payment-checkout and payment-webhook.
//
// No provider is integrated yet: getPaymentProvider() returns null, so both functions
// answer "online payments are not available" and nothing is charged. To integrate the
// chosen Pakistani provider (e.g. JazzCash, Easypaisa or a card gateway):
//   1. implement PaymentProvider for it in this folder, reading its credentials from
//      Supabase secrets (never from the app);
//   2. return it from getPaymentProvider() for its PAYMENT_PROVIDER value;
//   3. register the payment-webhook URL as the provider's server-to-server callback.

export type OnlineMethod = 'Easypaisa' | 'JazzCash' | 'Card';
export const ONLINE_METHODS: readonly OnlineMethod[] = ['Easypaisa', 'JazzCash', 'Card'];

export interface CheckoutRequest {
  /** Payment-attempts."ID": send it to the provider as the order reference. */
  attemptId: string;
  amount: number;
  currency: string;
  method: OnlineMethod;
  expiresAt: string;
}

/** Where the app sends the customer to pay: a hosted page URL, or a form to post. */
export interface CheckoutResult {
  redirectUrl?: string;
  form?: { action: string; fields: Record<string, string> };
}

/** A callback whose signature the adapter verified with the provider's secret. */
export interface VerifiedCallback {
  attemptId: string;
  providerRef: string;
  amount: number;
  currency: string;
  success: boolean;
  reason?: string;
}

export interface PaymentProvider {
  /** Lower-case id stored in Payment-attempts."Provider" (^[a-z_]{1,30}$). */
  id: string;
  methods: readonly OnlineMethod[];
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Returns null unless the request is an authentic callback from this provider. */
  verifyCallback(req: Request): Promise<VerifiedCallback | null>;
  /** The response this provider expects after a callback was processed. */
  acknowledge(attemptStatus: string): Response;
}

export function getPaymentProvider(name = Deno.env.get('PAYMENT_PROVIDER')): PaymentProvider | null {
  switch ((name || '').toLowerCase().trim()) {
    // Provider adapters are added here once the provider and its credentials are confirmed.
    default:
      return null;
  }
}
