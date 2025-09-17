import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://ezphoibukccydcryllvv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6cGhvaWJ1a2NjeWRjcnlsbHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTA5NDEsImV4cCI6MjA3MzYyNjk0MX0.DGsaV71NUjrS7pQhQHjCIXUpWRItjCbmOFqN6uxjhCI'; // Replace with your real anon key from Supabase dashboard

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database configuration for direct PostgreSQL connection if needed
export const DB_CONFIG = {
  host: 'db.ezphoibukccydcryllvv.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'KKb2n33a98'
};
