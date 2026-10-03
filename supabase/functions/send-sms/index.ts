// Supabase Edge Function: Send SMS Auth Hook (Deno runtime)
// Deploy with: supabase functions deploy send-sms --no-verify-jwt
// (Supabase Auth calls this hook with a signed webhook, not a user JWT.)
import { handleSendSmsHook } from './handler.ts';

Deno.serve(handleSendSmsHook);
