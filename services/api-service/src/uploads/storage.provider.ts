export interface StorageProvider {
  uploadFile(file: any): Promise<{ key: string; url: string; bucket?: string }>;
  deleteFile(key: string, bucket?: string): Promise<void>;
}

/** DI token for whichever backend `STORAGE_PROVIDER` selected at boot. */
export const ACTIVE_STORAGE_PROVIDER = 'ACTIVE_STORAGE_PROVIDER';

export type StorageProviderKind = 'LOCAL' | 'S3';

/**
 * Defaults to LOCAL so development and the docker-compose stack keep working
 * without any extra configuration. Deployed environments set S3 — their
 * filesystems are ephemeral, so LOCAL there would drop every upload on the
 * next restart.
 *
 * 'S3' names the protocol, not the vendor: Supabase Storage, R2, B2 and AWS
 * are all reached through it.
 */
export function resolveStorageProviderKind(): StorageProviderKind {
  return (process.env.STORAGE_PROVIDER ?? 'LOCAL').toUpperCase() === 'S3'
    ? 'S3'
    : 'LOCAL';
}
