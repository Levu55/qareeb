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
}

/** Helper as returned by qareeb_find_helpers (public fields only). */
export interface HelperListing {
  helper_id: string;
  full_name: string;
  rating: number;
  categories: string[];
  is_female: boolean;
  completed_jobs: number;
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
    })
    .select('ID,Title,Description,Price,Category,Location,"Female-only",Status')
    .single();
  if (error || !data) fail(error, 'Could not save your task.');
  return data as TaskRecord;
}

export async function getTask(taskId: string): Promise<TaskRecord | null> {
  const { data, error } = await supabase
    .from('Tasks')
    .select('ID,Title,Description,Price,Category,Location,"Female-only",Status')
    .eq('ID', taskId)
    .maybeSingle();
  if (error) fail(error, 'Could not load the task.');
  return data as TaskRecord | null;
}

export async function findHelpers(category: string | null, femaleOnly: boolean): Promise<HelperListing[]> {
  const { data, error } = await supabase.rpc('qareeb_find_helpers', {
    p_category: category || null,
    p_female_only: femaleOnly,
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
      fail(null, 'Booking was not allowed. Make sure your CNIC is approved and the task is still open.');
    }
    if (error?.code === '23505') {
      fail(null, 'This task already has an active booking.');
    }
    fail(error, 'Could not create the booking.');
  }
  return (data as { ID: string }).ID;
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
  if (error) fail(error, 'Could not update the booking.');
  if (!data || data.length === 0) fail(null, 'This booking could not be updated.');
}

export interface MyHelperRecord {
  'Is-available': boolean | null;
  'Verify-status': string | null;
  Categories: string[];
}

export async function getMyHelperRecord(): Promise<MyHelperRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('Helpers')
    .select('"Is-available","Verify-status",Categories')
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
