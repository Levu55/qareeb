// Tests for the review-cnic handler using an in-memory repo (no network, no database).
// Run: deno test --allow-env supabase/functions/review-cnic/review-cnic_test.ts
import { handleReviewCnic, isPendingReview, latestDocuments, type AuthUserLike, type ReviewRepo } from './handler.ts';

function assertEquals(actual: unknown, expected: unknown, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const ADMIN = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const HELPER = '33333333-3333-4333-8333-333333333333';
const OUTSIDER = '44444444-4444-4444-8444-444444444444';

function makeRepo() {
  const users = new Map<string, AuthUserLike>([
    [ADMIN, { id: ADMIN, phone: '923000000001', user_metadata: { cnic_status: 'pending', cnic_submitted_at: '2026-09-01T00:00:00Z' }, app_metadata: { provider: 'phone' } }],
    [USER, { id: USER, phone: '923000000002', user_metadata: { cnic_status: 'pending', cnic_submitted_at: '2026-09-02T00:00:00Z' }, app_metadata: { provider: 'phone' } }],
    [HELPER, { id: HELPER, phone: '923000000003', user_metadata: { cnic_status: 'pending', cnic_submitted_at: '2026-09-03T00:00:00Z' }, app_metadata: { provider: 'phone' } }],
    [OUTSIDER, { id: OUTSIDER, phone: '923000000004', user_metadata: {}, app_metadata: { provider: 'phone' } }],
  ]);
  const roles: Record<string, string> = { [ADMIN]: 'admin', [USER]: 'user', [HELPER]: 'helper', [OUTSIDER]: 'user' };
  const helperStatus: Record<string, string> = { [HELPER]: 'Pending' };
  const files: Record<string, { name: string; created_at: string }[]> = {
    [USER]: [
      { name: 'front_1.jpg', created_at: '2026-09-02T00:00:01Z' },
      { name: 'front_2.jpg', created_at: '2026-09-02T00:00:05Z' },
      { name: 'back_1.jpg', created_at: '2026-09-02T00:00:02Z' },
      { name: 'diagnostic_1.png', created_at: '2026-09-02T00:00:03Z' },
    ],
    [HELPER]: [{ name: 'front_9.png', created_at: '2026-09-03T00:00:01Z' }],
  };
  const signedFor: string[] = [];
  const tokens: Record<string, string> = { 'jwt-admin': ADMIN, 'jwt-user': USER, 'jwt-helper': HELPER };

  const repo: ReviewRepo = {
    getCallerId: (jwt) => Promise.resolve(tokens[jwt] ?? null),
    isAdmin: (id) => Promise.resolve(roles[id] === 'admin' || roles[id] === 'superadmin'),
    listUsers: () => Promise.resolve([...users.values()]),
    getUser: (id) => Promise.resolve(users.get(id) ?? null),
    setAppMetadata: (id, meta) => { users.get(id)!.app_metadata = meta; return Promise.resolve(); },
    getProfiles: (ids) => Promise.resolve(ids.map((id) => ({ ID: id, 'Full-name': `Name ${id.slice(0, 4)}`, Phone: '+92300', Role: roles[id] }))),
    setHelperVerifyStatus: (id, s) => {
      if (!(id in helperStatus)) return Promise.resolve(false);
      helperStatus[id] = s;
      return Promise.resolve(true);
    },
    listDocuments: (id) => Promise.resolve(files[id] ?? []),
    signedUrls: (paths) => { signedFor.push(...paths); return Promise.resolve(paths.map((p) => `https://signed.example/${p}`)); },
  };
  return { repo, users, helperStatus, signedFor };
}

function call(repo: ReviewRepo, token: string | null, body: unknown, method = 'POST') {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return handleReviewCnic(
    new Request('http://localhost/review-cnic', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }),
    repo,
  ).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
}

Deno.test('rejects unauthenticated and non-admin callers', async () => {
  const { repo } = makeRepo();
  assertEquals((await call(repo, null, { action: 'list' })).status, 401, 'no token');
  assertEquals((await call(repo, 'jwt-forged', { action: 'list' })).status, 401, 'unknown token');
  assertEquals((await call(repo, 'jwt-user', { action: 'list' })).status, 403, 'regular user');
  assertEquals((await call(repo, 'jwt-helper', { action: 'review', userId: USER, decision: 'approved' })).status, 403, 'helper approving');
  assertEquals((await call(repo, 'jwt-admin', {}, 'GET')).status, 405, 'GET');
});

Deno.test('list returns pending submissions with signed links for the newest CNIC files only', async () => {
  const { repo, signedFor } = makeRepo();
  const r = await call(repo, 'jwt-admin', { action: 'list' });
  assertEquals(r.status, 200);
  const ids = r.body.submissions.map((s: { userId: string }) => s.userId);
  assertEquals(ids, [ADMIN, USER, HELPER], 'pending users oldest first; outsider (never submitted) excluded');
  const own = r.body.submissions.find((s: { userId: string }) => s.userId === ADMIN);
  assertEquals(own.isSelf, true, 'own submission flagged');
  const user = r.body.submissions.find((s: { userId: string }) => s.userId === USER);
  assertEquals(user.documents.front, `https://signed.example/${USER}/front_2.jpg`, 'newest front');
  assertEquals(user.documents.back, `https://signed.example/${USER}/back_1.jpg`);
  assertEquals(user.documents.selfie, null, 'missing selfie is null');
  assert(!signedFor.some((p) => p.includes('diagnostic')), 'non-CNIC files are never signed');
  assertEquals(r.body.linkExpiresInSeconds, 600);
});

Deno.test('admin cannot review own submission', async () => {
  const { repo, users } = makeRepo();
  const r = await call(repo, 'jwt-admin', { action: 'review', userId: ADMIN, decision: 'approved' });
  assertEquals(r.status, 403);
  assertEquals(users.get(ADMIN)!.app_metadata!.cnic_status, undefined, 'unchanged');
});

Deno.test('input validation', async () => {
  const { repo } = makeRepo();
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: 'not-a-uuid', decision: 'approved' })).status, 400);
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: USER, decision: 'maybe' })).status, 400);
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: USER, decision: 'rejected' })).status, 400, 'reject needs reason');
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: '55555555-5555-4555-8555-555555555555', decision: 'approved' })).status, 404);
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: OUTSIDER, decision: 'approved' })).status, 409, 'nothing submitted');
  assertEquals((await call(repo, 'jwt-admin', { action: 'nope' })).status, 400);
});

Deno.test('approving a customer sets app_metadata and keeps existing keys', async () => {
  const { repo, users } = makeRepo();
  const r = await call(repo, 'jwt-admin', { action: 'review', userId: USER, decision: 'approved' });
  assertEquals(r.status, 200);
  assertEquals(r.body.helperUpdated, false);
  const meta = users.get(USER)!.app_metadata!;
  assertEquals(meta.cnic_status, 'approved');
  assertEquals(meta.cnic_reviewed_by, ADMIN);
  assertEquals(meta.provider, 'phone', 'existing app_metadata preserved');
  assertEquals((await call(repo, 'jwt-admin', { action: 'review', userId: USER, decision: 'rejected', note: 'x' })).status, 409, 'no double review');
});

Deno.test('rejecting a helper records the reason and updates helper verification', async () => {
  const { repo, users, helperStatus } = makeRepo();
  const r = await call(repo, 'jwt-admin', { action: 'review', userId: HELPER, decision: 'rejected', note: '  Photo is not a CNIC  ' });
  assertEquals(r.status, 200);
  assertEquals(r.body.helperUpdated, true);
  assertEquals(helperStatus[HELPER], 'Rejected');
  assertEquals(users.get(HELPER)!.app_metadata!.cnic_review_note, 'Photo is not a CNIC');
});

Deno.test('approving a helper sets Verify-status Approved', async () => {
  const { repo, helperStatus } = makeRepo();
  await call(repo, 'jwt-admin', { action: 'review', userId: HELPER, decision: 'approved' });
  assertEquals(helperStatus[HELPER], 'Approved');
});

Deno.test('pending logic: re-submission after rejection returns to the queue', () => {
  const base = { id: USER };
  assert(!isPendingReview({ ...base, user_metadata: {} }), 'never submitted');
  assert(isPendingReview({ ...base, user_metadata: { cnic_status: 'pending' } }), 'submitted, unreviewed');
  assert(!isPendingReview({ ...base, user_metadata: { cnic_status: 'pending' }, app_metadata: { cnic_status: 'approved' } }), 'approved');
  assert(!isPendingReview({ ...base, user_metadata: { cnic_status: 'pending', cnic_submitted_at: '2026-01-01T00:00:00Z' }, app_metadata: { cnic_status: 'rejected', cnic_reviewed_at: '2026-01-02T00:00:00Z' } }), 'rejected, not resubmitted');
  assert(isPendingReview({ ...base, user_metadata: { cnic_status: 'pending', cnic_submitted_at: '2026-01-03T00:00:00Z' }, app_metadata: { cnic_status: 'rejected', cnic_reviewed_at: '2026-01-02T00:00:00Z' } }), 'resubmitted after rejection');
});

Deno.test('latestDocuments ignores unrelated files', () => {
  assertEquals(latestDocuments([{ name: 'diagnostic_1.png' }, { name: 'selfie_1.jpg' }]), { selfie: 'selfie_1.jpg' });
});
