import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateReportTemplateDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  reportType!: string;

  @IsOptional() @IsString()
  configJson?: string | null;

  @IsOptional() @IsString()
  scope?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  createUser?: string | null;
}
