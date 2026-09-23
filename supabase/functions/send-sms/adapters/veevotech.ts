import { SMSAdapter, SendResult } from './types.ts';

export class VeevoTechAdapter implements SMSAdapter {
  name = 'VeevoTech';

  async send(to: string, otp: string): Promise<SendResult> {
    const hash = Deno.env.get('VEEVO_HASH');
    const senderNum = Deno.env.get('VEEVO_SENDER_NUM') || 'Qareeb';

    if (!hash) {
      return {
        success: false,
        error: 'Missing Veevo Tech credentials. VEEVO_HASH must be configured in Supabase secrets.',
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

    const endpoint = 'https://api.veevotech.com/v3/sendsms';
    const body = {
      hash,
      receivernum: recipient,
      sendernum: senderNum,
      textmessage: message,
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
          error: `Veevo Tech API returned HTTP ${response.status}: ${responseText}`,
          rawResponse: responseJson || responseText,
        };
      }

      const isSuccess = responseJson?.status === 'success' || 
                        responseJson?.code === '200' ||
                        responseText.toLowerCase().includes('success');

      if (!isSuccess && (responseJson?.error || responseJson?.message)) {
        return {
          success: false,
          error: `Veevo Tech error: ${responseJson.error || responseJson.message || responseText}`,
          rawResponse: responseJson || responseText,
        };
      }

      return {
        success: true,
        messageId: responseJson?.message_id || responseJson?.transid || undefined,
        rawResponse: responseJson || responseText,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Veevo Tech network failure: ${err?.message || err}`,
      };
    }
  }
}
