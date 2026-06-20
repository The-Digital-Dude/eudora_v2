import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageProvider } from './storage.provider';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  private readonly storageProvider: StorageProvider;
  private readonly providerType: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly localStorageService: LocalStorageService,
    private readonly s3StorageService: S3StorageService,
  ) {
    this.providerType = this.configService.get<string>('STORAGE_PROVIDER', 'LOCAL').toUpperCase();
    if (this.providerType === 'S3') {
      this.storageProvider = this.s3StorageService;
    } else {
      this.storageProvider = this.localStorageService;
    }
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

    // Delete from storage provider
    if (fileUpload.provider === 'S3') {
      await this.s3StorageService.deleteFile(fileUpload.key, fileUpload.bucket || undefined);
    } else {
      await this.localStorageService.deleteFile(fileUpload.key);
    }

    // Delete from db
    await this.prisma.fileUpload.delete({
      where: { id },
    });

    return { success: true };
  }
}
