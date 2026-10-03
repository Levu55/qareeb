// Supabase Edge Function: admin CNIC review (Deno runtime)
// Deploy with JWT verification ON (default): supabase functions deploy review-cnic
import { handleReviewCnic } from './handler.ts';
import { createServiceRepo } from './repo.ts';

const repo = createServiceRepo();

Deno.serve((req) => handleReviewCnic(req, repo));
