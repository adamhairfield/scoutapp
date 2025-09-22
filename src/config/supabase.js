import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://ezphoibukccydcryllvv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6cGhvaWJ1a2NjeWRjcnlsbHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTA5NDEsImV4cCI6MjA3MzYyNjk0MX0.DGsaV71NUjrS7pQhQHjCIXUpWRItjCbmOFqN6uxjhCI';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Note: Database credentials removed for security. 
// Row Level Security (RLS) policies handle access control.
