
import { createClient } from '@supabase/supabase-js';
import { ChromeStorageAdapter } from './storage-adapter';

// TODO: Replace with your actual Supabase URL and Anon Key
// You can get these from your Supabase Dashboard -> Project Settings -> API
export const SUPABASE_URL = 'https://plqaimunaapclxztxbok.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscWFpbXVuYWFwY2x4enR4Ym9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzQ1OTIsImV4cCI6MjA3OTY1MDU5Mn0.WtHF6pbaXRjLFkm3oaBmhgMbTPHzXyq_rRjBOgdRkds';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ChromeStorageAdapter,
        autoRefreshToken: false, // Prevent content scripts from trying to refresh
        persistSession: true,    // Enable persistence via ChromeStorageAdapter
        detectSessionInUrl: false // Important for extensions
    }
});
