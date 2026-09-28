// §5/§6 storage abstraction — Postgres holds metadata only; binaries go to R2/local.
export type StorageProvider = "r2" | "local" | "supabase";

export interface StoredFile {
  provider: StorageProvider;
  key: string;
  mimeType: string;
  size: number;
}

export interface StorageAdapter {
  readonly provider: StorageProvider;
  upload(key: string, data: Uint8Array, mimeType: string): Promise<StoredFile>;
  download(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

export function buildStorageKey(kind: "resume" | "evidence", userId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${kind}/${userId}/${Date.now()}_${safe}`;
}
