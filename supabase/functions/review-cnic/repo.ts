// Service-role implementation of ReviewRepo. The service key is provided by the
// Supabase Edge runtime (SUPABASE_SERVICE_ROLE_KEY) and never leaves the server.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { CNIC_BUCKET, type AuthUserLike, type ProfileLike, type ReviewRepo, type StoredFile } from './handler.ts';

export function createServiceRepo(): ReviewRepo {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.');
  }
  const db: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async getCallerId(jwt) {
      const { data, error } = await db.auth.getUser(jwt);
      return error ? null : data.user?.id ?? null;
    },

    async isAdmin(userId) {
      const { data, error } = await db.from('Profiles').select('Role').eq('ID', userId).maybeSingle();
      if (error) throw error;
      return data?.Role === 'admin' || data?.Role === 'superadmin';
    },

    async listUsers() {
      const users: AuthUserLike[] = [];
      const perPage = 1000;
      for (let page = 1; ; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < perPage) break;
      }
      return users;
    },

    async getUser(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) return null;
      return data.user;
    },

    async setAppMetadata(userId, appMetadata) {
      const { error } = await db.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
      if (error) throw error;
    },

    async getProfiles(userIds) {
      const { data, error } = await db.from('Profiles').select('ID,"Full-name",Phone,Role').in('ID', userIds);
      if (error) throw error;
      return (data ?? []) as ProfileLike[];
    },

    async setHelperVerifyStatus(userId, status) {
      const { data, error } = await db.from('Helpers').update({ 'Verify-status': status }).eq('ID', userId).select('ID');
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async listDocuments(userId) {
      const { data, error } = await db.storage.from(CNIC_BUCKET).list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data ?? []) as StoredFile[];
    },

    async logAction(actorId, action, targetId, details) {
      const { data: actor } = await db.from('Profiles').select('Role').eq('ID', actorId).maybeSingle();
      const { error } = await db.from('Admin-logs').insert({
        'Actor-id': actorId,
        'Actor-role': actor?.Role || 'admin',
        Action: action,
        'Target-table': 'auth.users',
        'Target-id': targetId,
        Details: details,
      });
      if (error) throw error;
    },

    async notify(userId, type, title, body) {
      const { error } = await db.from('Notifications').insert({ 'User-id': userId, Type: type, Title: title, Body: body });
      if (error) throw error;
    },

    async signedUrls(paths, expiresInSeconds) {
      const { data, error } = await db.storage.from(CNIC_BUCKET).createSignedUrls(paths, expiresInSeconds);
      if (error) throw error;
      return paths.map((p) => data?.find((d) => d.path === p)?.signedUrl ?? null);
    },
  };
}
