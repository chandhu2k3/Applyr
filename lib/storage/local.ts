import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type { StorageAdapter, StoredFile } from "./types";

// Free-first local adapter for dev: stores under ./data/files (gitignored).
export class LocalStorageAdapter implements StorageAdapter {
  readonly provider = "local" as const;
  constructor(private root = join(process.cwd(), "data", "files")) {}
  async upload(key: string, data: Uint8Array, mimeType: string): Promise<StoredFile> {
    const full = join(this.root, key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return { provider: "local", key, mimeType, size: data.byteLength };
  }
  async download(key: string): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(join(this.root, key)));
  }
  async remove(key: string): Promise<void> {
    await fs.unlink(join(this.root, key)).catch(() => {});
  }
}
