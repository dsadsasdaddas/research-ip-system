import { IsOptional, IsString, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeePlanDto {
  @IsOptional() @Type(() => Number) @IsInt() feeId?: number;
  @IsOptional() @IsString() relationType?: string;
  @IsOptional() @Type(() => Number) @IsInt() relationId?: number;
  @IsOptional() @Type(() => Number) @IsInt() planYear?: number;
  @IsString() dueDate!: string;
  @IsOptional() @Type(() => Number) @IsNumber() amount?: number;
  @IsOptional() @Type(() => Number) @IsInt() deptId?: number;
}
