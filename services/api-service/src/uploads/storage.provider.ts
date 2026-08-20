export interface StorageProvider {
  uploadFile(file: any): Promise<{ key: string; url: string; bucket?: string }>;
  /**
   * Stores an object that must not be publicly readable — a CV carries a home
   * address and phone number, so it cannot live in the same flat public
   * namespace as course thumbnails. Returns no URL, because there is no URL to
   * hand out; callers reach the object through getSignedUrl instead.
   */
  uploadPrivateFile(
    file: any,
    keyPrefix: string,
  ): Promise<{ key: string; bucket?: string }>;
  /**
   * Time-limited read URL for a private object. Short-lived by default: these
   * get pasted into browser history and support threads.
   */
  getSignedUrl(
    key: string,
    bucket: string | undefined,
    expiresInSeconds: number,
  ): Promise<string>;
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
