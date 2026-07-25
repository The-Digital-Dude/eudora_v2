import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignClassDto {
  @IsString()
  @IsNotEmpty()
  classSectionId: string;

  @IsString()
  @IsOptional()
  role?: string; // PRIMARY, ASSISTANT, SUBSTITUTE
}
