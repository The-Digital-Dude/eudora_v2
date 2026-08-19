import { Logger, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import {
  ACTIVE_STORAGE_PROVIDER,
  StorageProvider,
  resolveStorageProviderKind,
} from './storage.provider';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      // Constructed through a factory rather than registered as two injectable
      // providers so only the selected backend is ever instantiated:
      // S3StorageService throws at construction when its credentials are
      // missing, which would otherwise break boot for every LOCAL environment.
      provide: ACTIVE_STORAGE_PROVIDER,
      useFactory: (): StorageProvider => {
        const kind = resolveStorageProviderKind();
        Logger.log(`Storage backend: ${kind}`, 'UploadsModule');
        return kind === 'S3'
          ? new S3StorageService()
          : new LocalStorageService();
      },
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
