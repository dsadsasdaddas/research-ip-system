import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduledReportTaskDto {
  @Type(() => Number) @IsNumber()
  templateId!: number;

  @IsString()
  taskName!: string;

  @IsString()
  cronExpr!: string;

  @IsOptional() @IsString()
  receivers?: string | null;

  @IsOptional() @IsString()
  channel?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
