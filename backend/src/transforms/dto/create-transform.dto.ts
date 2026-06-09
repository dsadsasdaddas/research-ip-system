import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTransformDto {
  @IsOptional() @IsString() resultType?: string;
  @IsOptional() @IsInt() resultId?: number;

  @IsOptional() @IsString() @MaxLength(100) contractNo?: string;
  @IsOptional() @IsString() @MaxLength(255) partner?: string;
  @IsOptional() @IsNumber() contractAmount?: number;
  @IsOptional() @IsNumber() receivedAmount?: number;
  @IsOptional() @IsString() transformDate?: string;
  @IsOptional() @IsString() transformType?: string;
  @IsOptional() @IsString() finishStatus?: string;
  @IsOptional() @IsString() abnormalReason?: string;
  @IsOptional() @IsString() distributeRatio?: string;
  @IsOptional() @IsInt() deptId?: number;
  @IsOptional() @IsString() createUser?: string;
}
