import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateReportTemplateDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  reportType?: string;

  @IsOptional() @IsString()
  configJson?: string | null;

  @IsOptional() @IsString()
  scope?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
