import { supabase } from './supabaseClient';
import { SERVICE_CATEGORIES } from '../config/businessLogic';

// Database values (see supabase/migrations)
export type TaskStatus = 'Open' | 'Assigned' | 'Completed' | 'Cancelled';
export type BookingStatus =
  | 'Pending' | 'Accepted' | 'Rejected' | 'On-the-way' | 'Arrived' | 'In-progress' | 'Completed' | 'Cancelled';

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['Pending', 'Accepted', 'On-the-way', 'Arrived', 'In-progress'];

// localStorage keys that carry the current flow between screens
export const CURRENT_TASK_KEY = 'qareeb_current_task_id';
export const CURRENT_BOOKING_KEY = 'qareeb_current_booking_id';

export interface NewTask {
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  femaleOnly: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TaskRecord {
  ID: string;
  Title: string | null;
  Description: string | null;
  Price: number | null;
  Category: string | null;
  Location: string | null;
  'Female-only': boolean;
  Status: TaskStatus;
  Latitude: number | null;
  Longitude: number | null;
}

/** Helper as returned by qareeb_find_helpers (public fields only). */
export interface HelperListing {
  helper_id: string;
  full_name: string;
  rating: number;
  categories: string[];
  is_female: boolean;
  completed_jobs: number;
  review_count: number;
  /** Straight-line km from the task; null when either location is unknown or stale. */
  distance_km: number | null;
}

/** Booking as returned by qareeb_my_bookings. */
export interface MyBooking {
  booking_id: string;
  task_id: string;
  status: BookingStatus;
  scheduled_at: string | null;
  created_at: string;
  my_role: 'customer' | 'helper';
  counterpart_id: string;
  counterpart_name: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  price: number | null;
  female_only: boolean;
  completed_at: string | null;
  task_latitude: number | null;
  task_longitude: number | null;
  helper_distance_km: number | null;
  helper_location_updated_at: string | null;
  my_review_rating: number | null;
}

export function categoryName(id: string | null | undefined): string {
  return SERVICE_CATEGORIES.find((c) => c.id === id)?.name || id || '';
}

export function avatarUrl(name: string | null | undefined): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Q')}&background=FF6B2C&color=fff`;
}

export function formatPrice(price: number | null | undefined): string {
  return `Rs. ${Number(price || 0).toLocaleString('en-PK')}`;
}

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export async function createTask(task: NewTask): Promise<TaskRecord> {
  const { data, error } = await supabase
    .from('Tasks')
    .insert({
      Title: task.title.trim(),
      Description: task.description.trim(),
      Price: task.price,
      Category: task.category,
      Location: task.location.trim(),
      'Female-only': task.femaleOnly,
      Latitude: task.latitude ?? null,
      Longitude: task.longitude ?? null,
    })
    .select('ID,Title,Description,Price,Category,Location,"Female-only",Status,Latitude,Longitude')
    .single();
  if (error || !data) fail(error, 'Could not save your task.');
  return data as TaskRecord;
}

export async function getTask(taskId: string): Promise<TaskRecord | null> {
  const { data, error } = await supabase
    .from('Tasks')
    .select('ID,Title,Description,Price,Category,Location,"Female-only",Status,Latitude,Longitude')
    .eq('ID', taskId)
    .maybeSingle();
  if (error) fail(error, 'Could not load the task.');
  return data as TaskRecord | null;
}

export async function findHelpers(
  category: string | null,
  femaleOnly: boolean,
  latitude?: number | null,
  longitude?: number | null
): Promise<HelperListing[]> {
  const { data, error } = await supabase.rpc('qareeb_find_helpers', {
    p_category: category || null,
    p_female_only: femaleOnly,
    p_lat: latitude ?? null,
    p_lng: longitude ?? null,
  });
  if (error) fail(error, 'Could not load helpers.');
  return (data || []) as HelperListing[];
}

export async function createBooking(taskId: string, helperId: string): Promise<string> {
  const { data, error } = await supabase
    .from('Bookings')
    .insert({ 'Task-id': taskId, 'Helper-id': helperId })
    .select('ID')
    .single();
  if (error || !data) {
    if (error?.code === '42501') {
      // Database rules explain themselves (e.g. service/female-only mismatch); RLS denials do not
      fail(null, error.message && !error.message.includes('row-level security')
        ? error.message
        : 'Booking was not allowed. Make sure your CNIC is approved and the task is still open.');
    }
    if (error?.code === '23505') {
      fail(null, 'This task already has an active booking.');
    }
    fail(error, 'Could not create the booking.');
  }
  return (data as { ID: string }).ID;
}

/** Cancels one of the signed-in customer's open tasks (only allowed while it has no active booking). */
export async function cancelTask(taskId: string): Promise<void> {
  const { data, error } = await supabase
    .from('Tasks')
    .update({ Status: 'Cancelled' })
    .eq('ID', taskId)
    .select('ID');
  if (error) fail(error, 'Could not cancel the task.');
  if (!data || data.length === 0) fail(null, 'This task could not be cancelled.');
}

/**
 * Calls onChange whenever a booking matching `filter` (e.g. `ID=eq.<id>`) changes, via Supabase
 * Realtime. RLS decides which rows are delivered. Returns a function that unsubscribes.
 */
export function onBookingsChange(filter: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`bookings-${filter}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'Bookings', filter }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getMyBookings(): Promise<MyBooking[]> {
  const { data, error } = await supabase.rpc('qareeb_my_bookings');
  if (error) fail(error, 'Could not load bookings.');
  return (data || []) as MyBooking[];
}

export async function getMyBooking(bookingId: string): Promise<MyBooking | null> {
  const bookings = await getMyBookings();
  return bookings.find((b) => b.booking_id === bookingId) || null;
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
  const { data, error } = await supabase
    .from('Bookings')
    .update({ Status: status })
    .eq('ID', bookingId)
    .select('ID');
  if (error?.code === '23505') {
    fail(null, 'You already have an active job. Finish it before accepting another.');
  }
  if (error) fail(error, 'Could not update the booking.');
  if (!data || data.length === 0) fail(null, 'This booking could not be updated.');
}

export interface MyHelperRecord {
  'Is-available': boolean | null;
  'Verify-status': string | null;
  Categories: string[];
  Rating: number | null;
}

export async function getMyHelperRecord(): Promise<MyHelperRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('Helpers')
    .select('"Is-available","Verify-status",Categories,Rating')
    .eq('ID', user.id)
    .maybeSingle();
  if (error) fail(error, 'Could not load your helper profile.');
  return data as MyHelperRecord | null;
}

export async function setMyAvailability(isAvailable: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) fail(null, 'Please sign in again.');
  const { data, error } = await supabase
    .from('Helpers')
    .update({ 'Is-available': isAvailable })
    .eq('ID', user!.id)
    .select('ID');
  if (error) fail(error, 'Could not update availability.');
  if (!data || data.length === 0) fail(null, 'Helper profile not found.');
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewRecord {
  ID: string;
  'Booking-id': string;
  Rating: number;
  Comment: string | null;
  'Created-at': string;
}

/** Creates or updates the signed-in user's review of a completed booking (the reviewee is set by the database). */
export async function submitReview(bookingId: string, rating: number, comment: string): Promise<void> {
  const payload = { Rating: rating, Comment: comment.trim() || null };
  const { error } = await supabase.from('Reviews').insert({ 'Booking-id': bookingId, ...payload });
  if (!error) return;
  if (error.code === '23505') {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from('Reviews')
      .update(payload)
      .eq('Booking-id', bookingId)
      .eq('Reviewer-id', user?.id ?? '');
    if (updateError) fail(updateError, 'Could not update your review.');
    return;
  }
  if (error.code === '42501') fail(null, 'Reviews can only be left for your own completed bookings.');
  fail(error, 'Could not save your review.');
}

/** Reviews written about the signed-in user, newest first. */
export async function getReviewsAboutMe(limit = 20): Promise<ReviewRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('Reviews')
    .select('ID,"Booking-id",Rating,Comment,"Created-at"')
    .eq('Reviewee-id', user.id)
    .order('Created-at', { ascending: false })
    .limit(limit);
  if (error) fail(error, 'Could not load reviews.');
  return (data || []) as ReviewRecord[];
}

// ---------------------------------------------------------------------------
// Earnings: value of completed jobs. Payments/payouts are a separate, future integration.
// ---------------------------------------------------------------------------

export interface EarningsDay {
  day: string; // YYYY-MM-DD (Asia/Karachi)
  jobs: number;
  amount: number;
}

export async function getMyEarnings(days = 7): Promise<EarningsDay[]> {
  const { data, error } = await supabase.rpc('qareeb_helper_earnings', { p_days: days });
  if (error) fail(error, 'Could not load earnings.');
  return ((data || []) as EarningsDay[]).map((d) => ({ ...d, jobs: Number(d.jobs), amount: Number(d.amount) }));
}

// ---------------------------------------------------------------------------
// Location, distance and ETA (free: browser geolocation + OpenStreetMap Nominatim)
// ---------------------------------------------------------------------------

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Looks up an address with OpenStreetMap Nominatim (free; low-volume use per its usage policy). */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const query = address.trim();
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pk&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const results = await res.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) return null;
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  } catch {
    return null;
  }
}

/** Current device position via the browser (asks the user for permission). */
export function getBrowserPosition(timeoutMs = 10000): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** Saves the signed-in helper's current position (used for distance/ETA; customers never receive the coordinates). */
export async function updateMyHelperLocation(coords: Coordinates): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('Helpers')
    .update({ Latitude: coords.latitude, Longitude: coords.longitude, 'Location-updated-at': new Date().toISOString() })
    .eq('ID', user.id);
  if (error) fail(error, 'Could not update your location.');
}

/** Captures the helper's position if the browser allows it; silently does nothing otherwise. */
export async function shareHelperLocation(): Promise<boolean> {
  const coords = await getBrowserPosition();
  if (!coords) return false;
  await updateMyHelperLocation(coords);
  return true;
}

// Distance is straight-line; ETA assumes city roads are ~30% longer than a straight line at ~25 km/h.
const ROAD_FACTOR = 1.3;
const AVERAGE_SPEED_KMH = 25;

export function formatDistance(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(Number(km))) return null;
  const value = Number(km);
  return value < 1 ? `${Math.max(50, Math.round((value * 1000) / 50) * 50)} m` : `${value.toFixed(1)} km`;
}

export function formatEta(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(Number(km))) return null;
  const minutes = Math.max(1, Math.round(((Number(km) * ROAD_FACTOR) / AVERAGE_SPEED_KMH) * 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/** OpenStreetMap embed centred on a point (free, no API key). */
export function osmEmbedUrl(coords: Coordinates, span = 0.01): string {
  const { latitude: lat, longitude: lng } = coords;
  const bbox = [lng - span, lat - span, lng + span, lat + span].map((v) => v.toFixed(5)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
}

// ---------------------------------------------------------------------------
// Payments, wallet and settings. Payment rows are created by the database when a booking
// completes; clients only read them and act through the functions below. No online payment
// provider is integrated yet.
// ---------------------------------------------------------------------------

export type PaymentMethod = 'Cash' | 'Easypaisa' | 'JazzCash' | 'Card';
export type PaymentStatus = 'Due' | 'Awaiting-confirmation' | 'Paid' | 'Failed';

export interface PaymentRecord {
  ID: string;
  'Booking-id': string;
  'Payer-id': string;
  'Payee-id': string;
  Amount: number;
  Currency: string;
  Method: PaymentMethod | null;
  Status: PaymentStatus;
  'Created-at': string;
  'Paid-at': string | null;
}

const PAYMENT_COLUMNS = 'ID,"Booking-id","Payer-id","Payee-id",Amount,Currency,Method,Status,"Created-at","Paid-at"';

export async function getPaymentForBooking(bookingId: string): Promise<PaymentRecord | null> {
  const { data, error } = await supabase.from('Payments').select(PAYMENT_COLUMNS).eq('Booking-id', bookingId).maybeSingle();
  if (error) fail(error, 'Could not load the payment.');
  return data as PaymentRecord | null;
}

/** Payments where the signed-in user is the payer or the payee, newest first. */
export async function getMyPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase.from('Payments').select(PAYMENT_COLUMNS).order('Created-at', { ascending: false }).limit(100);
  if (error) fail(error, 'Could not load payments.');
  return (data || []) as PaymentRecord[];
}

export async function choosePaymentMethod(bookingId: string, method: PaymentMethod): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc('qareeb_choose_payment_method', { p_booking_id: bookingId, p_method: method });
  if (error) fail(error, 'Could not save the payment method.');
  return data as PaymentStatus;
}

export async function confirmCashReceived(bookingId: string): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc('qareeb_confirm_cash_received', { p_booking_id: bookingId });
  if (error) fail(error, 'Could not confirm the payment.');
  return data as PaymentStatus;
}

/** Jobs above this amount must be paid online (Settings table; config value as fallback). */
export async function getDigitalPaymentThreshold(fallback: number): Promise<number> {
  const { data } = await supabase.from('Settings').select('Value').eq('Key', 'digital_payment_threshold').maybeSingle();
  const value = Number((data as { Value?: unknown } | null)?.Value);
  return Number.isFinite(value) ? value : fallback;
}

export interface WalletRecord {
  Balance: number;
  Currency: string;
}

export interface TransactionRecord {
  ID: string;
  Type: string | null;
  Amount: number;
  Status: string;
  'Created-at': string | null;
  'Booking-id': string | null;
}

export async function getMyWallet(): Promise<WalletRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('Wallets').select('Balance,Currency').eq('User-id', user.id).maybeSingle();
  if (error) fail(error, 'Could not load your wallet.');
  return data as WalletRecord | null;
}

export async function getMyTransactions(): Promise<TransactionRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('Transactions')
    .select('ID,Type,Amount,Status,"Created-at","Booking-id"')
    .eq('User-id', user.id)
    .order('Created-at', { ascending: false })
    .limit(50);
  if (error) fail(error, 'Could not load transactions.');
  return (data || []) as TransactionRecord[];
}

// ---------------------------------------------------------------------------
// Booking chat and notifications (RLS limits both to the people involved; delivered by Realtime)
// ---------------------------------------------------------------------------

export interface MessageRecord {
  ID: string;
  'Booking-id': string;
  'Sender-id': string;
  Body: string;
  'Created-at': string;
  'Read-at': string | null;
}

export async function getMessages(bookingId: string): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from('Messages')
    .select('ID,"Booking-id","Sender-id",Body,"Created-at","Read-at"')
    .eq('Booking-id', bookingId)
    .order('Created-at', { ascending: true })
    .limit(500);
  if (error) fail(error, 'Could not load messages.');
  return (data || []) as MessageRecord[];
}

/** Latest message per booking for the conversation list. */
export async function getLatestMessages(bookingIds: string[]): Promise<Record<string, MessageRecord>> {
  if (bookingIds.length === 0) return {};
  const { data, error } = await supabase
    .from('Messages')
    .select('ID,"Booking-id","Sender-id",Body,"Created-at","Read-at"')
    .in('Booking-id', bookingIds)
    .order('Created-at', { ascending: false })
    .limit(500);
  if (error) fail(error, 'Could not load conversations.');
  const latest: Record<string, MessageRecord> = {};
  for (const m of (data || []) as MessageRecord[]) if (!latest[m['Booking-id']]) latest[m['Booking-id']] = m;
  return latest;
}

export async function sendMessage(bookingId: string, body: string): Promise<void> {
  const { error } = await supabase.from('Messages').insert({ 'Booking-id': bookingId, Body: body.trim() });
  if (error?.code === '42501') fail(null, 'Messages can only be sent while the booking is active (and up to 3 days after completion).');
  if (error) fail(error, 'Could not send the message.');
}

export async function markMessagesRead(bookingId: string): Promise<void> {
  await supabase.rpc('qareeb_mark_messages_read', { p_booking_id: bookingId });
}

export function onMessagesChange(bookingId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`messages-${bookingId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'Messages', filter: `Booking-id=eq.${bookingId}` }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export interface NotificationRecord {
  ID: string;
  Type: string;
  Title: string;
  Body: string | null;
  'Booking-id': string | null;
  'Created-at': string;
  'Read-at': string | null;
}

export async function getNotifications(limit = 30): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('Notifications')
    .select('ID,Type,Title,Body,"Booking-id","Created-at","Read-at"')
    .order('Created-at', { ascending: false })
    .limit(limit);
  if (error) fail(error, 'Could not load notifications.');
  return (data || []) as NotificationRecord[];
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await supabase.rpc('qareeb_mark_notifications_read', { p_ids: ids ?? null });
  if (error) fail(error, 'Could not update notifications.');
}

export function onNotificationsChange(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`notifications-${userId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Notifications', filter: `User-id=eq.${userId}` }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
