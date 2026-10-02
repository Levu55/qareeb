// Supabase Auth Send SMS Hook request handler (Deno runtime)
// Official Spec: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { SMSAdapter } from './adapters/types.ts';
import { SendPKAdapter } from './adapters/sendpk.ts';
import { VeevoTechAdapter } from './adapters/veevotech.ts';
import { AiSMSAdapter } from './adapters/aisms.ts';
import { DevLogAdapter } from './adapters/devlog.ts';
import { isPakistaniMobile, redactSecrets, toPakistaniMsisdn } from './adapters/phone.ts';

export function getAdapter(providerName?: string): SMSAdapter {
  const normalized = (providerName || Deno.env.get('SMS_PROVIDER') || 'sendpk').toLowerCase().trim();

  switch (normalized) {
    case 'veevotech':
    case 'veevo':
      return new VeevoTechAdapter();
    case 'aisms':
      return new AiSMSAdapter();
    case 'devlog':
      // Development only, never selected by default: see adapters/devlog.ts
      return new DevLogAdapter();
    case 'sendpk':
    default:
      return new SendPKAdapter();
  }
}

export async function handleSendSmsHook(req: Request): Promise<Response> {
  // Handle CORS preflight if invoked from browser/testing tools
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature, x-supabase-signature',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 405,
          message: 'Method not allowed. Send SMS Hook expects POST.',
        },
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const rawPayload = await req.text();
  const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET') || Deno.env.get('AUTH_HOOK_SECRET');

  let user: { id?: string; phone: string; [key: string]: unknown };
  let sms: { otp: string; [key: string]: unknown };

  if (rawSecret) {
    try {
      const base64Secret = rawSecret.replace(/^v1,whsec_/, '');
      const headers = Object.fromEntries(req.headers);
      const wh = new Webhook(base64Secret);
      const verified = wh.verify(rawPayload, headers) as any;
      user = verified?.user;
      sms = verified?.sms;
    } catch (err: any) {
      console.warn('[Qareeb SMS Hook] Signature verification failed:', err?.message || err);
      return new Response(
        JSON.stringify({
          error: {
            http_code: 401,
            message: 'Unauthorized: Invalid or missing Webhook signature',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // Fail closed: without signature verification anyone could trigger paid SMS sends
    console.error('[Qareeb SMS Hook] SEND_SMS_HOOK_SECRET is not configured. Refusing unsigned request.');
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'SMS hook is not configured: SEND_SMS_HOOK_SECRET is missing.',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const phone = user?.phone;
  const otp = sms?.otp;

  if (!phone || !otp) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 400,
          message: 'Missing required payload fields: user.phone and sms.otp must be present.',
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Supabase Auth accepts any number; paid OTP SMS go to Pakistani mobiles only
  // (also stops SMS-pumping through foreign or premium-rate numbers)
  const recipient = toPakistaniMsisdn(phone);
  if (!isPakistaniMobile(recipient)) {
    console.warn(`[Qareeb SMS Hook] Refused OTP for a number that is not a Pakistani mobile (${recipient.slice(0, 4)}****)`);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 400,
          message: 'Phone verification is only available for Pakistani mobile numbers (03XX XXXXXXX).',
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const adapter = getAdapter();
  console.log(`[Qareeb SMS Hook] Dispatching OTP via ${adapter.name} to ${recipient.slice(0, 5)}****`);

  const result = await adapter.send(recipient, otp);

  if (!result.success) {
    // Provider errors can contain request URLs (API keys) or echo the message (OTP)
    const detail = redactSecrets(result.error || 'Failed to dispatch SMS via regional provider.', otp);
    console.error(`[Qareeb SMS Hook] Dispatch failed via ${adapter.name}:`, detail);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: detail,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(`[Qareeb SMS Hook] ${adapter.name} accepted the OTP request. MessageId:`, result.messageId ?? 'none');

  // According to official Supabase Send SMS Hook spec:
  // "An empty response with a status code of 200 is taken as a successful response."
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
