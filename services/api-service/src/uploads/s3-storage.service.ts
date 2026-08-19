import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.provider';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Object storage over the S3 protocol.
 *
 * Deliberately vendor-neutral rather than tied to one provider: Supabase
 * Storage, Cloudflare R2, Backblaze B2 and AWS S3 itself all speak this API,
 * so moving between them is a change of environment variables rather than
 * code. Currently pointed at Supabase, which was the option that needed no
 * card on file.
 *
 * Objects are served from `S3_PUBLIC_URL`, so the URL this returns is
 * absolute — unlike LocalStorageService's `/api/uploads/<key>`, which only
 * ever resolved correctly while the API and client shared an origin.
 *
 * Local disk is not viable in a deployed environment: every host we use has an
 * ephemeral filesystem, so uploads would disappear on each restart.
 */
@Injectable()
export class S3StorageService implements StorageProvider {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  /** Where objects that must not be publicly readable go. */
  private readonly privateBucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = requireEnv('S3_BUCKET');
    // Falls back to the public bucket rather than failing at boot, so an
    // existing deployment keeps starting after this ships. uploadPrivateFile
    // warns loudly every time that fallback is actually used.
    this.privateBucket = process.env.S3_PRIVATE_BUCKET || this.bucket;
    // A trailing slash would produce `host//key`, which is a different (and
    // missing) object rather than being normalised away.
    this.publicUrl = requireHttpUrl('S3_PUBLIC_URL').replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint: requireEnv('S3_ENDPOINT'),
      region: process.env.S3_REGION || 'auto',
      // Supabase and most non-AWS implementations require path-style addressing
      // (host/bucket/key); AWS itself prefers virtual-host style. Defaults on
      // because the providers that need it are the ones we actually use.
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
      credentials: {
        accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
      },
    });

    this.logger.log(`S3 storage ready (bucket: ${this.bucket})`);
  }

  async uploadFile(
    file: any,
  ): Promise<{ key: string; url: string; bucket: string }> {
    // Random rather than the timestamp+counter LocalStorageService uses: keys
    // land in a single flat public namespace, so they should not be guessable
    // from the time of upload.
    const extension = path.extname(file.originalname);
    const key = `${crypto.randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      key,
      url: `${this.publicUrl}/${key}`,
      bucket: this.bucket,
    };
  }

  /**
   * Writes to S3_PRIVATE_BUCKET when one is configured, otherwise to the main
   * bucket under a prefix. The separate bucket is strongly preferred: the main
   * one is public precisely so uploaded images resolve without signing, and a
   * prefix inside it is a naming convention, not an access control.
   *
   * Also sets ACL private explicitly. On AWS with an older bucket that has
   * ACLs enabled and a public-read default this is what keeps the object out
   * of anonymous reach; on Supabase and R2 it is accepted and ignored.
   */
  async uploadPrivateFile(
    file: any,
    keyPrefix: string,
  ): Promise<{ key: string; bucket?: string }> {
    const extension = path.extname(file.originalname);
    const key = `${keyPrefix.replace(/^\/+|\/+$/g, '')}/${crypto.randomUUID()}${extension}`;
    const bucket = this.privateBucket;

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private',
      }),
    );

    if (bucket === this.bucket) {
      this.logger.warn(
        `Private upload stored in the public bucket "${bucket}" under "${keyPrefix}/". ` +
          `Set S3_PRIVATE_BUCKET so these objects are not reachable by URL.`,
      );
    }

    return { key, bucket };
  }

  async getSignedUrl(
    key: string,
    bucket: string | undefined,
    expiresInSeconds: number,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket || this.privateBucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteFile(key: string, bucket?: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket || this.bucket,
        Key: key,
      }),
    );
  }
}

/**
 * Fail at boot rather than at the first upload. A missing credential surfaces
 * here as an unmistakable startup error instead of a 500 the first time a user
 * attaches a file — which is the failure mode the removed S3 provider had: it
 * silently returned a fabricated URL for a file it never uploaded.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required when STORAGE_PROVIDER=S3. Set it, or use STORAGE_PROVIDER=LOCAL for local development.`,
    );
  }
  return value;
}

/**
 * The public base URL is concatenated with the object key and persisted, so
 * whatever it holds ends up in the database and in pages. That makes a wrong
 * value actively dangerous rather than merely broken: the storage settings and
 * the database connection string sit on adjacent pages in the hosting
 * dashboard, and pasting the latter here would embed database credentials into
 * every stored file URL. Refuse anything that is not plain http(s) at boot.
 */
function requireHttpUrl(name: string): string {
  const value = requireEnv(name);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `${name} must be an http(s) URL, got protocol "${parsed.protocol}". ` +
        `It is the public base URL files are served from — not a database connection string.`,
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      `${name} must not contain credentials. This value is concatenated with ` +
        `object keys and stored in the database, so any secret in it would leak.`,
    );
  }
  return value;
}
