import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const BUSINESS_TYPES = ['paper', 'patent', 'copyright', 'transform', 'fee', 'secret'] as const;

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  flowCode?: string;

  @IsOptional()
  @IsString()
  flowName?: string;

  @IsOptional()
  @IsString()
  @IsIn(BUSINESS_TYPES)
  businessType?: string;

  @IsOptional()
  @IsString()
  secretLevel?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}
