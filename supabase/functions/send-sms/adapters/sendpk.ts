import { SMSAdapter, SendResult } from './types.ts';

// SendPK API reference: https://sendpk.com/api.php
// Current auth is api_key + an approved OTP template (template_id). Template variables
// are sent in `message` as a JSON object, e.g. template "Your code is #otp#" -> {"otp":"123456"}.
// The legacy username/password pair is deprecated by SendPK and only used as a fallback.
export class SendPKAdapter implements SMSAdapter {
  name = 'SendPK';

  async send(to: string, otp: string): Promise<SendResult> {
    const apiKey = Deno.env.get('SENDPK_API_KEY');
    const templateId = Deno.env.get('SENDPK_TEMPLATE_ID');
    const otpVar = Deno.env.get('SENDPK_OTP_VARIABLE') || 'otp';
    const username = Deno.env.get('SENDPK_USERNAME');
    const password = Deno.env.get('SENDPK_PASSWORD');
    const sender = Deno.env.get('SENDPK_SENDER_ID') || 'Qareeb';

    if (apiKey && !templateId) {
      return {
        success: false,
        error: 'Missing SENDPK_TEMPLATE_ID. SendPK requires an approved OTP template when using SENDPK_API_KEY.',
      };
    }
    if (!apiKey && (!username || !password)) {
      return {
        success: false,
        error: 'Missing SendPK credentials. Configure SENDPK_API_KEY and SENDPK_TEMPLATE_ID in Supabase secrets.',
      };
    }

    // Format phone number for Pakistani networks: 923XXXXXXXXX
    const cleanNumber = to.replace(/\D/g, '');
    const recipient = cleanNumber.startsWith('92')
      ? cleanNumber
      : cleanNumber.startsWith('03')
      ? '92' + cleanNumber.slice(1)
      : cleanNumber;

    const params = new URLSearchParams({ sender, mobile: recipient });
    if (apiKey) {
      params.set('api_key', apiKey);
      params.set('template_id', templateId!);
      params.set('message', JSON.stringify({ [otpVar]: otp }));
    } else {
      params.set('username', username!);
      params.set('password', password!);
      params.set('message', `Your Qareeb verification code is: ${otp}. Valid for 10 minutes. Please do not share this code with anyone.`);
    }

    try {
      const response = await fetch(`https://sendpk.com/api/sms.php?${params.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'text/plain' },
      });
      const responseText = (await response.text()).trim();

      if (!response.ok) {
        return {
          success: false,
          error: `SendPK API returned HTTP ${response.status}: ${responseText}`,
          rawResponse: responseText,
        };
      }

      // Documented success body is "OK ID:<message id>"; anything else is an error code/message
      const match = responseText.match(/^OK\b.*?ID\s*:\s*(\S+)/i);
      if (!/^OK\b/i.test(responseText)) {
        return {
          success: false,
          error: `SendPK error: ${responseText || 'empty response'}`,
          rawResponse: responseText,
        };
      }

      return {
        success: true,
        messageId: match?.[1],
        rawResponse: responseText,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `SendPK network failure: ${err?.message || err}`,
      };
    }
  }
}
