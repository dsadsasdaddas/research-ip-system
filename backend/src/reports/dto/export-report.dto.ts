import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportReportDto {
  @Type(() => Number)
  @IsNumber()
  templateId!: number;

  @IsOptional()
  @IsString()
  format?: string;
}
