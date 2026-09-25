import { supabase } from './supabaseClient';
import type { Role } from '../store/useAppStore';

/**
 * Normalizes user-inputted phone numbers to standard E.164 format.
 * Defaults to Pakistan country code (+92) if local format (03XX...) is entered.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  // Remove spaces, hyphens, parentheses
  let cleaned = raw.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0092')) {
    return '+92' + cleaned.slice(4);
  }
  if (cleaned.startsWith('92')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('03')) {
    return '+92' + cleaned.slice(1);
  }
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '+92' + cleaned;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Maps Supabase raw error messages to user-friendly notifications.
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const msg = typeof error === 'string' ? error : error.message || '';

  if (msg.toLowerCase().includes('phone signups are disabled') || 
      msg.toLowerCase().includes('phone logins are disabled') ||
      msg.toLowerCase().includes('unsupported phone provider')) {
    return 'Phone authentication is currently disabled in the Supabase Dashboard. Please enable the Phone provider in Supabase > Authentication > Providers.';
  }

  if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
    return 'Incorrect phone number or password. Please verify your details.';
  }

  if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) {
    return 'An account with this phone number already exists. Please log in.';
  }

  if (msg.toLowerCase().includes('token has expired') || msg.toLowerCase().includes('expired otp')) {
    return 'The OTP has expired. Please request a new verification code.';
  }

  if (msg.toLowerCase().includes('token is invalid') || msg.toLowerCase().includes('invalid token') || msg.toLowerCase().includes('invalid otp')) {
    return 'Invalid OTP code. Please check and try again.';
  }

  if (msg.toLowerCase().includes('rate limit')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }

  if (msg.toLowerCase().includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }

  return msg || 'Authentication request failed. Please check your connection.';
}

export type CnicStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

/**
 * Resolves CNIC verification status from a Supabase user.
 * Approval/rejection is only trusted from app_metadata, which users cannot modify
 * (set server-side by an admin/service role). user_metadata is user-writable, so it
 * can only signal that documents were submitted ('pending').
 */
export function getCnicStatus(user: any): CnicStatus {
  const reviewed = user?.app_metadata?.cnic_status;
  if (reviewed === 'approved' || reviewed === 'rejected') {
    return reviewed;
  }
  return user?.user_metadata?.cnic_status === 'pending' ? 'pending' : 'unverified';
}

/**
 * Synchronizes the authenticated user record with the existing Phase 1 database schema.
 * Respects exact existing column names: Profiles (ID, Full-name, Phone, Role) and Helpers (ID, Rating).
 * "Full-name" is NOT NULL in the Profiles table, so it must be sent on every upsert.
 */
export async function syncUserProfile(
  userId: string,
  phone: string,
  role: Role,
  metadata?: { full_name?: string; referral_code?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: profileError } = await supabase
      .from('Profiles')
      .upsert({
        ID: userId,
        'Full-name': metadata?.full_name?.trim() || '',
        Phone: phone,
        Role: role,
      }, { onConflict: 'ID' });

    if (profileError) {
      console.error('Profiles upsert failed:', profileError.message);
      return { success: false, error: profileError.message };
    }

    if (role === 'helper') {
      const { error: helperError } = await supabase
        .from('Helpers')
        .upsert({
          ID: userId,
          Rating: 5.0,
        }, { onConflict: 'ID' });

      if (helperError) {
        console.error('Helpers upsert failed:', helperError.message);
        return { success: false, error: helperError.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing profile:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Uploads CNIC document or selfie to the private Supabase Storage bucket 'cnic-verifications'.
 */
export async function uploadCNICDocument(
  file: File,
  userId: string,
  docType: 'front' | 'back' | 'selfie'
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${docType}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('cnic-verifications')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, path: data?.path || filePath };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to upload document.' };
  }
}
