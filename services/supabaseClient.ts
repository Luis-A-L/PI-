import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Configurações do Supabase
// Injetadas diretamente para o ambiente de MVP conforme solicitado
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qstlzfitgxftvghnrjci.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdGx6Zml0Z3hmdHZnaG5yamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzQ3NzAsImV4cCI6MjA4NDUxMDc3MH0._pWatecRvW_O7dJiDmMivnSLCCQRqEUYJ0tRpkcUOhY';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const isConfigured = () => {
  return supabaseUrl !== 'https://placeholder-url.supabase.co' && supabaseUrl !== '';
};