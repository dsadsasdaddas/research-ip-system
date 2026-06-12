import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

const PAY_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'] as const;
const FEE_TYPES = ['申请费', '年费', '代理费', '维持费', '复审费'] as const;
const FUND_SOURCES = ['院内经费', '纵向课题', '横向课题', '外协资助'] as const;
const RELATION_TYPES = ['patent', 'copyright'] as const;

export class CreateFeeDto {
  @IsOptional() @IsString() @IsIn(RELATION_TYPES) relationType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() relationId?: number;
  @IsOptional() @IsString() relationName?: string;

  @IsOptional() @IsString() @IsIn(FEE_TYPES) feeType?: string;
  @IsOptional() @IsString() @IsIn(FUND_SOURCES) fundSource?: string;
  @IsOptional() @Type(() => Number) @IsNumber() amount?: number;

  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() paidDate?: string;
  @IsOptional() @IsString() voucherNo?: string;
  @IsOptional() @IsString() @IsIn(PAY_STATUSES) payStatus?: string;
  @IsOptional() @IsString() remark?: string;

  @IsOptional() @Type(() => Number) @IsNumber() deptId?: number;
}
