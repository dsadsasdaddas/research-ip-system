import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LogSecretAccessDto {
  @IsOptional() @Type(() => Number) @IsNumber()
  grantId?: number | null;

  @IsString()
  businessType!: string;

  @Type(() => Number) @IsNumber()
  businessId!: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  userId?: number | null;

  @IsOptional() @IsString()
  username?: string | null;

  @IsString()
  action!: string;

  @IsOptional() @IsBoolean()
  success?: boolean;

  @IsOptional() @IsString()
  ip?: string | null;

  @IsOptional() @IsString()
  reason?: string | null;
}
