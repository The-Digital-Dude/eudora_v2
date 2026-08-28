import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GradeBand, StoryAssetKind } from '@prisma/client';

export class CreateStoryDto {
  /** The ModuleItem slot this story fills. Must be of kind STORY. */
  @IsUUID()
  moduleItemId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  synopsis?: string;

  @IsEnum(GradeBand)
  @IsOptional()
  gradeBand?: GradeBand;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  agentGuidance?: string;
}

export class UpdateStoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  synopsis?: string;

  @IsEnum(GradeBand)
  @IsOptional()
  gradeBand?: GradeBand;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  agentGuidance?: string;

  /** Must already be an asset on this story. */
  @IsUUID()
  @IsOptional()
  coverAssetId?: string | null;
}

export class CreateChapterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** Appended to the end when omitted. */
  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateChapterDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

export class CreateSegmentDto {
  /**
   * One paragraph or beat. Kept as its own row rather than a slice of chapter
   * text because narration is generated per segment and playback position maps
   * back to it — that mapping is what later drives illustration changes.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSegmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  text?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

/** Reordering is a whole-list operation, so a partial list cannot leave gaps. */
export class ReorderDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids: string[];
}

export class CreateAssetDto {
  @IsEnum(StoryAssetKind)
  @IsOptional()
  kind?: StoryAssetKind;

  /** Storage key from an upload; never a URL — signed URLs expire. */
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  /** Required: stories are read by children who may use a screen reader. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  altText: string;

  /** Bind to a segment to make this the art shown while that beat narrates. */
  @IsUUID()
  @IsOptional()
  segmentId?: string | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  sortOrder?: number;
}

/** Bulk-authoring shape, so a whole story arrives in one call. */
export class ImportChapterDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsString({ each: true })
  segments: string[];
}

export class ImportStoryDto {
  @IsUUID()
  moduleItemId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  synopsis?: string;

  @IsEnum(GradeBand)
  @IsOptional()
  gradeBand?: GradeBand;

  @IsString()
  @IsOptional()
  agentGuidance?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportChapterDto)
  chapters: ImportChapterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCharacterDto)
  @IsOptional()
  characters?: CreateCharacterDto[];
}
