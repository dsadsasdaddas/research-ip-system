import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSecretAccessGrantDto {
  @IsString()
  businessType!: string;

  @Type(() => Number) @IsNumber()
  businessId!: number;

  @Type(() => Number) @IsNumber()
  grantUserId!: number;

  @IsOptional() @IsString()
  grantUsername?: string | null;

  @IsOptional() @IsString()
  grantScope?: string;

  @IsOptional() @IsString()
  startTime?: string | null;

  @IsOptional() @IsString()
  endTime?: string | null;

  @IsOptional() @IsString()
  grantReason?: string | null;
}
