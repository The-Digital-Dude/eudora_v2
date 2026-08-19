import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: any): Promise<{ key: string; url: string }> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    return {
      key: filename,
      url: `/api/uploads/${filename}`,
    };
  }

  /**
   * Development stand-in for a private bucket. The prefix becomes a real
   * subdirectory, and nothing serves it: UploadsController.serveFile resolves
   * to the flat upload root and rejects anything with path segments, so these
   * are unreachable over HTTP. They come back only through the signed-URL path
   * below, which the owning module gates on the caller's role.
   */
  async uploadPrivateFile(
    file: any,
    keyPrefix: string,
  ): Promise<{ key: string; bucket?: string }> {
    const prefix = keyPrefix.replace(/^\/+|\/+$/g, '');
    const dir = path.join(this.uploadDir, prefix);
    await fs.promises.mkdir(dir, { recursive: true });

    const extension = path.extname(file.originalname);
    const key = `${prefix}/${crypto.randomUUID()}${extension}`;
    await fs.promises.writeFile(path.join(this.uploadDir, key), file.buffer);

    return { key };
  }

  /**
   * There is no signing to do on local disk, and inventing a token scheme here
   * would be a second auth system to keep correct for the sake of development
   * convenience. Callers must handle this by streaming the file themselves —
   * see readPrivateFile.
   */
  async getSignedUrl(): Promise<string> {
    throw new Error(
      'LOCAL storage cannot produce signed URLs; read the file through the owning endpoint instead.',
    );
  }

  /** Reads a private object back, for the endpoint that streams it. */
  async readPrivateFile(key: string): Promise<Buffer> {
    const filePath = path.resolve(this.uploadDir, key);
    // `key` is ours, not user input, but resolve-then-check costs nothing and
    // survives someone later passing a value that is not.
    if (!filePath.startsWith(path.resolve(this.uploadDir) + path.sep)) {
      throw new Error('Refusing to read outside the upload directory');
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
