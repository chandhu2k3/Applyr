import { FileStore } from "./file-store";
import type { Store } from "./types";

// Supabase when configured (hosted + persistent), file store otherwise (local, ₹0).
// The Supabase driver is lazy-loaded so local/file mode never touches @supabase
// (a broken or absent cloud dep must not take down local routes).
let memo: Store | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getStore(): Promise<Store> {
  if (memo) return memo;
  if (supabaseConfigured()) {
    try {
      const { SupabaseStore } = await import("./supabase-store");
      memo = new SupabaseStore();
      return memo;
    } catch {
      // fall through to file store
    }
  }
  memo = new FileStore();
  return memo;
}
