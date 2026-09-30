import { LocalStorageAdapter } from "./local";
import type { StorageAdapter } from "./types";

// Local disk now (free, private). Cloudflare R2 later via the same interface.
let memo: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!memo) memo = new LocalStorageAdapter();
  return memo;
}
