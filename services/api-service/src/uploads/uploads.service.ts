import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { StorageProvider } from './storage.provider';
import {
  ACTIVE_STORAGE_PROVIDER,
  resolveStorageProviderKind,
} from './storage.provider';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  // Which backend is active, recorded on every row so the origin of a file
  // stays traceable after the environment's configuration changes. An S3
  // provider used to be selected here but never uploaded anything — the AWS
  // SDK was not installed and the service returned a fabricated URL — so rows
  // marked 'S3' point at files that do not exist.
  private readonly providerType = resolveStorageProviderKind();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACTIVE_STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  get isLocal(): boolean {
    return this.providerType === 'LOCAL';
  }

  async uploadFile(file: any, userId: string) {
    const result = await this.storageProvider.uploadFile(file);

    return this.prisma.fileUpload.create({
      data: {
        url: result.url,
        key: result.key,
        bucket: result.bucket || null,
        provider: this.providerType,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname,
        userId: userId,
      },
    });
  }

  /**
   * Only meaningful under LOCAL storage; R2 serves objects from its own public
   * URL and never routes through this service.
   *
   * `key` arrives straight from the URL, so it is reduced to a bare filename
   * before use and the resolved path is re-checked against the upload
   * directory — without that, `../` segments would let any caller read
   * arbitrary files off the container.
   */
  getLocalFilePath(key: string): string {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.resolve(uploadDir, path.basename(key));

    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
      throw new NotFoundException('File not found');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return filePath;
  }

  async deleteFile(id: string, userId: string, userRoles: string[]) {
    const fileUpload = await this.prisma.fileUpload.findUnique({
      where: { id },
    });

    if (!fileUpload) {
      throw new NotFoundException('File upload metadata not found');
    }

    // Only allow owner or admins to delete
    if (
      fileUpload.userId !== userId &&
      !userRoles.includes('SUPER_ADMIN') &&
      !userRoles.includes('ADMIN')
    ) {
      throw new ForbiddenException('Not authorized to delete this file');
    }

    // Deletes through whichever backend is currently active. A row written by
    // a different backend (a legacy 'LOCAL' or 'S3' row in an environment now
    // on R2) resolves to a key that isn't there, which both providers treat as
    // a no-op — so the metadata row is still removed rather than the request
    // failing on a file that cannot be found anyway.
    await this.storageProvider.deleteFile(
      fileUpload.key,
      fileUpload.bucket ?? undefined,
    );

    // Delete from db
    await this.prisma.fileUpload.delete({
      where: { id },
    });

    return { success: true };
  }
}
