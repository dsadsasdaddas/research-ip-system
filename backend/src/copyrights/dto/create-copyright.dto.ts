import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 新增软著时前端要传的字段(带入参校验)。
 * 字段对照说明书 §3.1.3:软著名称必填,其余可选。
 */
export class CreateCopyrightDto {
  @IsString()
  @IsNotEmpty({ message: '软著名称不能为空' })
  @MaxLength(500)
  name: string;

  @IsOptional() @IsString() copyrightOwner?: string;
  @IsOptional() @IsString() registrationNo?: string;
  @IsOptional() @IsString() publishDate?: string;
  @IsOptional() @IsString() registerDate?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsString() softwareType?: string;
  @IsOptional() @IsString() softwareIntro?: string;
  @IsOptional() @IsString() runEnv?: string;
  @IsOptional() @IsString() cooperateUnit?: string;
  @IsOptional() @IsString() dependProject?: string;
  @IsOptional() @IsString() secretLevel?: string;
  @IsOptional() @IsInt() deptId?: number;
  @IsOptional() @IsString() createUser?: string;
}
