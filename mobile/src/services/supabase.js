/**
 * Supabase client - same project as the web frontend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

export const isSupabaseConfigured = () =>
    !!(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project'));

export const supabase = isSupabaseConfigured()
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
              storage: AsyncStorage,
              persistSession: false, // no auth yet
              detectSessionInUrl: false,
          },
          global: {
              headers: { 'x-client-info': 'terraalert-mobile' },
          },
      })
    : null;
