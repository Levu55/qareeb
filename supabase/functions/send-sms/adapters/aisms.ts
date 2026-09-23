import { SMSAdapter, SendResult } from './types.ts';

export class AiSMSAdapter implements SMSAdapter {
  name = 'AiSMS';

  async send(to: string, otp: string): Promise<SendResult> {
    const apiKey = Deno.env.get('AISMS_API_KEY');
    const senderId = Deno.env.get('AISMS_SENDER_ID') || 'Qareeb';

    if (!apiKey) {
      return {
        success: false,
        error: 'Missing AiSMS credentials. AISMS_API_KEY must be configured in Supabase secrets.',
      };
    }

    const cleanNumber = to.replace(/\D/g, '');
    const recipient = cleanNumber.startsWith('92')
      ? cleanNumber
      : cleanNumber.startsWith('03')
      ? '92' + cleanNumber.slice(1)
      : cleanNumber;

    const message = `Your Qareeb verification code is: ${otp}. Valid for 10 minutes. Please do not share this code with anyone.`;

    const endpoint = 'https://api.aisms.net/sms/send';
    const body = {
      api_key: apiKey,
      sender: senderId,
      to: recipient,
      message,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Plain text response
      }

      if (!response.ok) {
        return {
          success: false,
          error: `AiSMS API returned HTTP ${response.status}: ${responseText}`,
          rawResponse: responseJson || responseText,
        };
      }

      return {
        success: true,
        messageId: responseJson?.id || responseJson?.message_id || undefined,
        rawResponse: responseJson || responseText,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `AiSMS network failure: ${err?.message || err}`,
      };
    }
  }
}
