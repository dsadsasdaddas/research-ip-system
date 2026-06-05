import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * 新增论文时前端要传的字段(带入参校验)。
 * 字段对照说明书 §3.1.1:标题必填,其余可选。
 */
export class CreatePaperDto {
  @IsString()
  @IsNotEmpty({ message: '论文标题不能为空' })
  @MaxLength(500)
  title: string;

  @IsOptional() @IsString() doi?: string;
  @IsOptional() @IsString() firstAuthor?: string;
  @IsOptional() @IsString() correspondingAuthor?: string;
  @IsOptional() @IsString() authors?: string;
  @IsOptional() @IsString() outerAuthors?: string;
  @IsOptional() @IsString() cooperateUnit?: string;
  @IsOptional() @IsString() journal?: string;
  @IsOptional() @IsString() issnCn?: string;
  @IsOptional() @IsString() volumePage?: string;
  @IsOptional() @IsInt() publishYear?: number;
  @IsOptional() @IsNumber() impactFactor?: number;
  @IsOptional() @IsString() includedType?: string;
  @IsOptional() @IsString() partition?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() secretLevel?: string;
  @IsOptional() @IsString() dependProject?: string;
  @IsOptional() @IsInt() deptId?: number;
  @IsOptional() @IsString() createUser?: string;
}
