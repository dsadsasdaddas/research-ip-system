import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 新增专利时前端要传的字段(带入参校验)。
 * 字段对照说明书 §3.1.2:专利名称必填,其余可选。
 */
export class CreatePatentDto {
  @IsString()
  @IsNotEmpty({ message: '专利名称不能为空' })
  @MaxLength(500)
  name: string;

  @IsOptional() @IsString() inventors?: string;
  @IsOptional() @IsString() outerInventors?: string;
  @IsOptional() @IsString() patentee?: string;
  @IsOptional() @IsString() applicationNo?: string;
  @IsOptional() @IsString() grantNo?: string;
  @IsOptional() @IsString() filingDate?: string;
  @IsOptional() @IsString() grantDate?: string;
  @IsOptional() @IsString() patentType?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() nextFeeDate?: string;
  @IsOptional() @IsNumber() feeAmount?: number;
  @IsOptional() @IsString() agency?: string;
  @IsOptional() @IsString() legalStatus?: string;
  @IsOptional() @IsString() pctStage?: string;
  @IsOptional() @IsString() nationalStage?: string;
  @IsOptional() @IsString() entryDate?: string;
  @IsOptional() @IsString() patentMark?: string;
  @IsOptional() @IsString() dependProject?: string;
  @IsOptional() @IsString() fundSource?: string;
  @IsOptional() @IsString() secretLevel?: string;
  @IsOptional() @IsInt() deptId?: number;
  @IsOptional() @IsString() createUser?: string;
}
