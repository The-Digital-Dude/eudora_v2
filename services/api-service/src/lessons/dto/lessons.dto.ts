import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum WidgetType {
  SLIDER_MANIPULATIVE = 'SLIDER_MANIPULATIVE',
  DRAG_AND_DROP_LABELS = 'DRAG_AND_DROP_LABELS',
  COORDINATE_PLOTTER = 'COORDINATE_PLOTTER',
  CODE_PLAYGROUND = 'CODE_PLAYGROUND',
  GRID_MATCHING = 'GRID_MATCHING',
  STANDARD_MCQ = 'STANDARD_MCQ',
}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsInt()
  @IsOptional()
  xpReward?: number;
}

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsNotEmpty()
  cardType: string; // CONCEPTUAL, INTERACTIVE, CHECKPOINT

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  questionId?: string;
}

export class SubmitCardResponseDto {
  @IsInt()
  @IsNotEmpty()
  timeSpentSeconds: number;

  @IsOptional()
  interactionState?: any; // JSON payload of slider/DND configuration

  @IsString()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsOptional()
  responseText?: string;
}
