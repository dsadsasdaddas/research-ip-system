import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeePaymentDto {
  @Type(() => Number) @IsNumber() paymentAmount!: number;
  @IsString() paymentDate!: string;
  @IsOptional() @IsString() @MaxLength(100) payer?: string;
  @IsOptional() @IsString() @MaxLength(255) remark?: string;
}
