import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB default limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.uploadsService.uploadFile(file, user.id);
  }

  /**
   * Serves files back off local disk in development only. Under R2 the bucket
   * serves objects from its own public URL and stored URLs are absolute, so
   * nothing reaches this route — it 404s rather than pretending to be the
   * canonical location for a file it does not have.
   */
  @Get(':key')
  @Public()
  async serveFile(@Param('key') key: string, @Res() res: Response) {
    if (!this.uploadsService.isLocal) {
      throw new NotFoundException('File not found');
    }
    const filePath = this.uploadsService.getLocalFilePath(key);
    res.sendFile(filePath);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.uploadsService.deleteFile(id, user.id, user.roles || []);
  }
}
