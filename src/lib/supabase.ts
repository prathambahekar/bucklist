import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://tnbadlzvyobczssypusz.supabase.co";
export const supabaseAnonKey = "sb_publishable__J8sJ67EIwcrQ1YKJkHLow_weIhS4OM";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
