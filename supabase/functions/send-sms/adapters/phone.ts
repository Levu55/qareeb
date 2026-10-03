// Phone number and error-text helpers shared by the hook and the SMS adapters.

/** Formats a phone number as a Pakistani MSISDN (923XXXXXXXXX). */
export function toPakistaniMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0092')) return digits.slice(2);
  if (digits.startsWith('03')) return '92' + digits.slice(1);
  if (digits.startsWith('3') && digits.length === 10) return '92' + digits;
  return digits;
}

/** Pakistani mobile numbers only (92 3XX XXXXXXX): OTPs are never sent anywhere else. */
export function isPakistaniMobile(msisdn: string): boolean {
  return /^923\d{9}$/.test(msisdn);
}

/**
 * Makes provider error text safe to log and return to Supabase Auth: URLs lose their
 * query strings (SendPK's carries the API key and the message) and the OTP is masked.
 */
export function redactSecrets(text: string, otp?: string): string {
  let safe = text.replace(/https?:\/\/[^\s)'"]+/gi, (raw) => {
    try {
      const url = new URL(raw);
      return url.origin + url.pathname;
    } catch {
      return '[url]';
    }
  });
  if (otp) safe = safe.split(otp).join('******');
  return safe;
}

/** Time limit for one provider request, so a hanging provider cannot stall sign-in. */
export const PROVIDER_TIMEOUT_MS = 10_000;
