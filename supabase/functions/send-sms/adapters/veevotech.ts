import type { SMSAdapter, SendResult } from './types.ts';
import { PROVIDER_TIMEOUT_MS, toPakistaniMsisdn } from './phone.ts';

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
    const recipient = toPakistaniMsisdn(to);

    const message = `Your Qareeb verification code is: ${otp}. It expires shortly. Please do not share this code with anyone.`;

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
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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

      // \b keeps "unsuccessful" from counting as success
      const isSuccess = responseJson?.status === 'success' ||
                        responseJson?.code === '200' ||
                        /\bsuccess/i.test(responseText);

      // Fail closed: a response without a success indicator is never reported as sent
      if (!isSuccess) {
        return {
          success: false,
          error: `Veevo Tech error: ${responseJson?.error || responseJson?.message || responseText || 'unrecognised response'}`,
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
