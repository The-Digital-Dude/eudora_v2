import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Week 2: schedules a DIAGNOSTIC-type assessment attempt for a student or
 * lead, reusing the assessments engine. Shape is fixed now so the
 * controller contract doesn't change once the scheduling logic lands.
 */
export class CreateDiagnosticDto {
  @IsString()
  @IsNotEmpty()
  assessmentId: string;

  @IsString()
  @IsOptional()
  studentProfileId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;
}
