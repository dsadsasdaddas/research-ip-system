import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateScheduledReportTaskDto {
  @IsOptional()
  @IsString()
  taskName?: string;

  @IsOptional()
  @IsString()
  cronExpr?: string;

  @IsOptional()
  @IsString()
  receivers?: string | null;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
