import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsUUID()
  @IsOptional()
  studentProfileId?: string;

  @IsUUID()
  @IsNotEmpty()
  teacherUserId: string;

  @IsString()
  @IsNotEmpty()
  firstMessageBody: string;
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[];
}
