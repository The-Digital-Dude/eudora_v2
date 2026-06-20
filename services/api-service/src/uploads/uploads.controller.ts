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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  async uploadFile(@UploadedFile() file: any, @CurrentUser() user: any) {
    return this.uploadsService.uploadFile(file, user.id);
  }

  @Get(':key')
  @Public()
  async serveFile(@Param('key') key: string, @Res() res: Response) {
    const filePath = this.uploadsService.getLocalFilePath(key);
    res.sendFile(filePath);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.uploadsService.deleteFile(id, user.id, user.roles || []);
  }
}
