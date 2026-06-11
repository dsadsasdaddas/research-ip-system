import { IsOptional, IsString, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeeVoucherDto {
  @Type(() => Number) @IsInt() paymentRecordId!: number;
  @IsOptional() @IsString() voucherNo?: string;
  @IsOptional() @Type(() => Number) @IsInt() attachmentId?: number;
  @IsOptional() @IsString() voucherType?: string;
}
