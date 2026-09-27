// Admin CNIC review: list pending submissions, approve/reject them, and revoke approvals.
// Approval is written to auth app_metadata (not user-editable) and, for helpers,
// to Helpers."Verify-status". Only admins/superadmins may call this, and never
// for their own submission.

export const CNIC_BUCKET = 'cnic-verifications';
export const DOC_TYPES = ['front', 'back', 'selfie'] as const;
const SIGNED_URL_SECONDS = 600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthUserLike {
  id: string;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}

export interface ProfileLike {
  ID: string;
  'Full-name'?: string | null;
  Phone?: string | null;
  Role?: string | null;
}

export interface StoredFile {
  name: string;
  created_at?: string | null;
}

/** Data access used by the handler (Supabase service-role client in production, fakes in tests). */
export interface ReviewRepo {
  getCallerId(jwt: string): Promise<string | null>;
  isAdmin(userId: string): Promise<boolean>;
  listUsers(): Promise<AuthUserLike[]>;
  getUser(userId: string): Promise<AuthUserLike | null>;
  setAppMetadata(userId: string, appMetadata: Record<string, unknown>): Promise<void>;
  getProfiles(userIds: string[]): Promise<ProfileLike[]>;
  setHelperVerifyStatus(userId: string, status: 'Approved' | 'Rejected' | 'Pending'): Promise<boolean>;
  listDocuments(userId: string): Promise<StoredFile[]>;
  signedUrls(paths: string[], expiresInSeconds: number): Promise<(string | null)[]>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function time(value: unknown): number {
  return typeof value === 'string' ? Date.parse(value) || 0 : 0;
}

/** A submission awaits review if the user submitted after the last admin decision (or never reviewed). */
export function isPendingReview(user: AuthUserLike): boolean {
  const submitted = user.user_metadata?.cnic_status === 'pending';
  const decision = user.app_metadata?.cnic_status;
  if (!submitted || decision === 'approved') return false;
  if (decision === 'rejected') {
    return time(user.user_metadata?.cnic_submitted_at) > time(user.app_metadata?.cnic_reviewed_at);
  }
  return true;
}

/** Newest uploaded file per document type (files are named <type>_<timestamp>.<ext>). */
export function latestDocuments(files: StoredFile[]): Partial<Record<(typeof DOC_TYPES)[number], string>> {
  const result: Partial<Record<(typeof DOC_TYPES)[number], string>> = {};
  for (const type of DOC_TYPES) {
    const matches = files
      .filter((f) => f.name.startsWith(`${type}_`))
      .sort((a, b) => {
        const byTime = time(b.created_at) - time(a.created_at);
        return byTime !== 0 ? byTime : b.name.localeCompare(a.name);
      });
    if (matches.length > 0) result[type] = matches[0].name;
  }
  return result;
}

export function isApproved(user: AuthUserLike): boolean {
  return user.app_metadata?.cnic_status === 'approved';
}

async function describe(repo: ReviewRepo, users: AuthUserLike[], callerId: string) {
  const profiles = users.length ? await repo.getProfiles(users.map((u) => u.id)) : [];
  const profileById = new Map(profiles.map((p) => [p.ID, p]));

  const submissions = [];
  for (const user of users) {
    const docs = latestDocuments(await repo.listDocuments(user.id));
    const types = DOC_TYPES.filter((t) => docs[t]);
    const urls = types.length
      ? await repo.signedUrls(types.map((t) => `${user.id}/${docs[t]}`), SIGNED_URL_SECONDS)
      : [];
    const documents: Record<string, string | null> = { front: null, back: null, selfie: null };
    types.forEach((t, i) => { documents[t] = urls[i] ?? null; });

    const profile = profileById.get(user.id);
    submissions.push({
      userId: user.id,
      name: profile?.['Full-name'] || (user.user_metadata?.full_name as string) || '',
      phone: profile?.Phone || (user.phone ? `+${user.phone.replace(/^\+/, '')}` : ''),
      role: profile?.Role || 'user',
      submittedAt: user.user_metadata?.cnic_submitted_at ?? null,
      previouslyRejected: user.app_metadata?.cnic_status === 'rejected',
      reviewedAt: user.app_metadata?.cnic_reviewed_at ?? null,
      isSelf: user.id === callerId,
      documents,
    });
  }
  return submissions;
}

async function listQueue(repo: ReviewRepo, callerId: string): Promise<Response> {
  const users = await repo.listUsers();
  const pending = users
    .filter(isPendingReview)
    .sort((a, b) => time(a.user_metadata?.cnic_submitted_at) - time(b.user_metadata?.cnic_submitted_at));
  const approved = users
    .filter(isApproved)
    .sort((a, b) => time(b.app_metadata?.cnic_reviewed_at) - time(a.app_metadata?.cnic_reviewed_at));

  return json(200, {
    submissions: await describe(repo, pending, callerId),
    approved: await describe(repo, approved, callerId),
    linkExpiresInSeconds: SIGNED_URL_SECONDS,
  });
}

/** Withdraws an approval and returns the submission to the review queue. */
async function revoke(repo: ReviewRepo, callerId: string, body: Record<string, unknown>): Promise<Response> {
  const userId = body.userId;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return json(400, { error: 'A valid userId is required.' });
  }
  if (!note) {
    return json(400, { error: 'A reason is required when revoking an approval.' });
  }
  if (userId === callerId) {
    return json(403, { error: 'You cannot revoke your own approval.' });
  }

  const target = await repo.getUser(userId);
  if (!target) {
    return json(404, { error: 'User not found.' });
  }
  if (!isApproved(target)) {
    return json(409, { error: 'This user is not currently approved.' });
  }

  await repo.setAppMetadata(userId, {
    ...(target.app_metadata ?? {}),
    cnic_status: null,
    cnic_revoked_at: new Date().toISOString(),
    cnic_revoked_by: callerId,
    cnic_review_note: note,
  });

  const helperUpdated = await repo.setHelperVerifyStatus(userId, 'Pending');

  return json(200, { ok: true, userId, decision: 'revoked', helperUpdated });
}

async function review(repo: ReviewRepo, callerId: string, body: Record<string, unknown>): Promise<Response> {
  const userId = body.userId;
  const decision = body.decision;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return json(400, { error: 'A valid userId is required.' });
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    return json(400, { error: 'decision must be "approved" or "rejected".' });
  }
  if (decision === 'rejected' && !note) {
    return json(400, { error: 'A reason is required when rejecting.' });
  }
  if (userId === callerId) {
    return json(403, { error: 'You cannot review your own CNIC submission.' });
  }

  const target = await repo.getUser(userId);
  if (!target) {
    return json(404, { error: 'User not found.' });
  }
  if (!isPendingReview(target)) {
    return json(409, { error: 'This submission is not awaiting review (it may already have been reviewed).' });
  }

  await repo.setAppMetadata(userId, {
    ...(target.app_metadata ?? {}),
    cnic_status: decision,
    cnic_reviewed_at: new Date().toISOString(),
    cnic_reviewed_by: callerId,
    cnic_review_note: note || null,
  });

  const helperUpdated = await repo.setHelperVerifyStatus(userId, decision === 'approved' ? 'Approved' : 'Rejected');

  return json(200, { ok: true, userId, decision, helperUpdated });
}

export async function handleReviewCnic(req: Request, repo: ReviewRepo): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const callerId = jwt ? await repo.getCallerId(jwt) : null;
  if (!callerId) {
    return json(401, { error: 'Please sign in.' });
  }
  if (!(await repo.isAdmin(callerId))) {
    return json(403, { error: 'Only admins can review CNIC submissions.' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  try {
    if (body.action === 'list') return await listQueue(repo, callerId);
    if (body.action === 'review') return await review(repo, callerId, body);
    if (body.action === 'revoke') return await revoke(repo, callerId, body);
    return json(400, { error: 'action must be "list", "review" or "revoke".' });
  } catch (err) {
    console.error('[review-cnic] failed:', err instanceof Error ? err.message : err);
    return json(500, { error: 'Review service error. Please try again.' });
  }
}
