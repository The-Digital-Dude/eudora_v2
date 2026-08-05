import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CatalogStatus, ModuleItemKind } from '@prisma/client';

export class CreateModuleItemDto {
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @IsEnum(ModuleItemKind)
  kind: ModuleItemKind;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  // VIDEO
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsInt()
  @IsOptional()
  videoDurationSeconds?: number;

  // READING
  @IsString()
  @IsOptional()
  readingContent?: string;

  // ASSESSMENT
  @IsString()
  @IsOptional()
  assessmentId?: string;

  // DISCUSSION — prompt for the auto-created thread
  @IsString()
  @IsOptional()
  discussionPrompt?: string;
}

export class UpdateModuleItemDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsInt()
  @IsOptional()
  videoDurationSeconds?: number;

  @IsString()
  @IsOptional()
  readingContent?: string;

  @IsString()
  @IsOptional()
  assessmentId?: string;
}

export class UpdateModuleItemProgressDto {
  @IsOptional()
  completed?: boolean;

  @IsInt()
  @IsOptional()
  lastPositionSeconds?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDiscussionPostDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  parentPostId?: string;
}
