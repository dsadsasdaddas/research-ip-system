import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrationType } from '../entities/integration-config.entity';

export class CreateIntegrationConfigDto {
  @IsEnum(IntegrationType)
  type!: IntegrationType;

  @IsString()
  name!: string;

  @IsOptional() @IsString()
  baseUrl?: string | null;

  @IsOptional() @IsString()
  apiKeyEnv?: string | null;

  @IsOptional() @IsBoolean()
  isEnabled?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1000) @Max(60000)
  timeoutMs?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  retryCount?: number;

  @IsOptional() @IsString()
  fallbackMode?: string;

  @IsOptional() @IsString()
  extra?: string | null;
}
