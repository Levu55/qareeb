import { supabase } from './supabaseClient';

// Admin data. Every read here is allowed only for admins by RLS / the functions themselves;
// a non-admin calling these gets an error or no rows.

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export interface AdminStats {
  customers: number;
  helpers_approved: number;
  helpers_pending: number;
  bookings_active: number;
  bookings_completed_today: number;
  job_value_completed_today: number;
  payments_paid_today: number;
  payments_open: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('qareeb_admin_stats');
  if (error) fail(error, 'Could not load statistics.');
  const row = (Array.isArray(data) ? data[0] : data) || {};
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v) || 0])) as unknown as AdminStats;
}

export interface AuditLogEntry {
  ID: string;
  'Actor-id': string | null;
  'Actor-role': string;
  Action: string;
  'Target-table': string | null;
  'Target-id': string | null;
  Details: Record<string, unknown>;
  'Created-at': string;
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('Admin-logs')
    .select('ID,"Actor-id","Actor-role",Action,"Target-table","Target-id",Details,"Created-at"')
    .order('Created-at', { ascending: false })
    .limit(limit);
  if (error) fail(error, 'Could not load the audit log.');
  return (data || []) as AuditLogEntry[];
}

export interface AdminPerson {
  id: string;
  name: string;
  phone: string;
  role: string;
  joinedAt: string | null;
  helper: { verifyStatus: string | null; rating: number; available: boolean; categories: string[] } | null;
}

export async function getPeople(): Promise<AdminPerson[]> {
  const [profiles, helpers] = await Promise.all([
    supabase.from('Profiles').select('ID,"Full-name",Phone,Role,"Created at"').order('Created at', { ascending: false }).limit(500),
    supabase.from('Helpers').select('ID,"Verify-status",Rating,"Is-available",Categories').limit(500),
  ]);
  if (profiles.error) fail(profiles.error, 'Could not load users.');
  if (helpers.error) fail(helpers.error, 'Could not load helpers.');
  const helperById = new Map((helpers.data || []).map((h: any) => [h.ID, h]));
  return (profiles.data || []).map((p: any) => {
    const h: any = helperById.get(p.ID);
    return {
      id: p.ID,
      name: p['Full-name'] || '',
      phone: p.Phone || '',
      role: p.Role || 'user',
      joinedAt: p['Created at'] || null,
      helper: h ? { verifyStatus: h['Verify-status'], rating: Number(h.Rating) || 0, available: Boolean(h['Is-available']), categories: h.Categories || [] } : null,
    };
  });
}

/** Names for a set of profile ids (admins can read all profiles). */
export async function getNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.from('Profiles').select('ID,"Full-name"').in('ID', unique);
  if (error) fail(error, 'Could not load names.');
  return Object.fromEntries((data || []).map((p: any) => [p.ID, p['Full-name'] || '']));
}

export interface AdminJob {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  customer: string;
  helper: string;
  title: string;
  category: string | null;
  price: number;
  payment: string | null;
}

export async function getJobs(): Promise<AdminJob[]> {
  const { data: bookings, error } = await supabase
    .from('Bookings')
    .select('ID,"Task-id","User-id","Helper-id",Status,"Created-at","Completed-at"')
    .order('Created-at', { ascending: false })
    .limit(200);
  if (error) fail(error, 'Could not load jobs.');
  const rows = bookings || [];
  const [tasks, payments, names] = await Promise.all([
    rows.length ? supabase.from('Tasks').select('ID,Title,Category,Price').in('ID', rows.map((b: any) => b['Task-id'])) : Promise.resolve({ data: [], error: null }),
    rows.length ? supabase.from('Payments').select('"Booking-id",Status').in('Booking-id', rows.map((b: any) => b.ID)) : Promise.resolve({ data: [], error: null }),
    getNames(rows.flatMap((b: any) => [b['User-id'], b['Helper-id']])),
  ]);
  if (tasks.error) fail(tasks.error, 'Could not load tasks.');
  if (payments.error) fail(payments.error, 'Could not load payments.');
  const taskById = new Map((tasks.data || []).map((t: any) => [t.ID, t]));
  const paymentByBooking = new Map((payments.data || []).map((p: any) => [p['Booking-id'], p.Status]));
  return rows.map((b: any) => {
    const t: any = taskById.get(b['Task-id']) || {};
    return {
      id: b.ID,
      status: b.Status,
      createdAt: b['Created-at'],
      completedAt: b['Completed-at'],
      customer: names[b['User-id']] || '',
      helper: names[b['Helper-id']] || '',
      title: t.Title || 'Task',
      category: t.Category || null,
      price: Number(t.Price) || 0,
      payment: paymentByBooking.get(b.ID) || null,
    };
  });
}

export interface SettingRecord {
  Key: string;
  Value: unknown;
  Description: string | null;
  'Updated-at': string;
}

export async function getSettings(): Promise<SettingRecord[]> {
  const { data, error } = await supabase.from('Settings').select('Key,Value,Description,"Updated-at"').order('Key');
  if (error) fail(error, 'Could not load settings.');
  return (data || []) as SettingRecord[];
}

/** Admin-only (RLS); every change is recorded in the audit log by the database. */
export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { data, error } = await supabase.from('Settings').update({ Value: value }).eq('Key', key).select('Key');
  if (error) fail(error, 'Could not save the setting.');
  if (!data || data.length === 0) fail(null, 'Only admins can change settings.');
}
