import { FileStore } from "./file-store";
import { SupabaseStore } from "./supabase-store";
import type { Store } from "./types";

// Supabase when configured (hosted + persistent), file store otherwise (local, ₹0).
let memo: Store | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStore(): Store {
  if (!memo) memo = supabaseConfigured() ? new SupabaseStore() : new FileStore();
  return memo;
}
