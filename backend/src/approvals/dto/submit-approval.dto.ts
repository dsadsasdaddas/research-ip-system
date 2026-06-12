import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const BUSINESS_TYPES = [
  'paper',
  'patent',
  'copyright',
  'transform',
  'fee',
  'secret',
] as const;

export class SubmitApprovalDto {
  @IsString()
  @IsIn(BUSINESS_TYPES)
  businessType!: string;

  @Type(() => Number)
  @IsNumber()
  businessId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
