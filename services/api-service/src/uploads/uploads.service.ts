import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from './local-storage.service';
import { StorageProvider } from './storage.provider';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  // Local disk is the only storage backend. An S3 provider used to be selected
  // here via STORAGE_PROVIDER, but it never uploaded anything — the AWS SDK was
  // never installed and the service returned a fabricated URL.
  private readonly providerType = 'LOCAL';
  private readonly storageProvider: StorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {
    this.storageProvider = this.localStorageService;
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

  getLocalFilePath(key: string): string {
    const filePath = path.join(process.cwd(), 'uploads', key);
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

    // Delete from storage provider. Rows written under the old 'S3' provider
    // point at files that were never actually uploaded, so this is a no-op for
    // them — deleteFile skips keys with no file on disk.
    await this.localStorageService.deleteFile(fileUpload.key);

    // Delete from db
    await this.prisma.fileUpload.delete({
      where: { id },
    });

    return { success: true };
  }
}
