import {
  IsOptional,
  IsNumber,
  IsInt,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransformDistributionDto {
  @IsOptional() @Type(() => Number) @IsNumber() innerRatio?: number;
  @IsOptional() @Type(() => Number) @IsNumber() teamRatio?: number;
  @IsOptional() @Type(() => Number) @IsNumber() personalRatio?: number;
  @IsOptional() @Type(() => Number) @IsNumber() actualAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() voucherAttachmentId?: number;
  @IsOptional() @IsString() @MaxLength(255) remark?: string;
}
