import { SMSAdapter, SendResult } from './types.ts';

export class SendPKAdapter implements SMSAdapter {
  name = 'SendPK';

  async send(to: string, otp: string): Promise<SendResult> {
    const username = Deno.env.get('SENDPK_USERNAME');
    const password = Deno.env.get('SENDPK_PASSWORD');
    const sender = Deno.env.get('SENDPK_SENDER_ID') || 'Qareeb';

    if (!username || !password) {
      return {
        success: false,
        error: 'Missing SendPK credentials. SENDPK_USERNAME and SENDPK_PASSWORD must be configured in Supabase secrets.',
      };
    }

    // Format phone number for Pakistani networks: 923XXXXXXXXX
    const cleanNumber = to.replace(/\D/g, '');
    const recipient = cleanNumber.startsWith('92')
      ? cleanNumber
      : cleanNumber.startsWith('03')
      ? '92' + cleanNumber.slice(1)
      : cleanNumber;

    const message = `Your Qareeb verification code is: ${otp}. Valid for 10 minutes. Please do not share this code with anyone.`;

    const endpoint = 'https://sendpk.com/api/sms.php';
    const params = new URLSearchParams({
      username,
      password,
      sender,
      mobile: recipient,
      message,
    });

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain',
        },
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Response is plain text
      }

      if (!response.ok) {
        return {
          success: false,
          error: `SendPK API returned HTTP ${response.status}: ${responseText}`,
          rawResponse: responseJson || responseText,
        };
      }

      // Check SendPK specific status
      const isSuccess = responseJson?.status === 'success' || 
                        responseJson?.code === 'OK' || 
                        responseText.toLowerCase().includes('success') ||
                        responseText.toLowerCase().includes('ok');

      if (!isSuccess && responseJson?.error) {
        return {
          success: false,
          error: `SendPK error: ${responseJson.error || responseText}`,
          rawResponse: responseJson || responseText,
        };
      }

      return {
        success: true,
        messageId: responseJson?.message_id || responseJson?.id || undefined,
        rawResponse: responseJson || responseText,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `SendPK network failure: ${err?.message || err}`,
      };
    }
  }
}
