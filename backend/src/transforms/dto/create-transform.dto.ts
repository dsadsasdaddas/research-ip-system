import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTransformDto {
  @IsOptional() @IsString() resultType?: string;
  @IsOptional() @IsInt() resultId?: number;

  @IsOptional() @IsString() @MaxLength(100) contractNo?: string;
  // 交易对方:转化记录的最小必要业务字段(没有对方的转化记录无意义)。
  // 其余业务列在 schema 中均可为空,故只强制 partner,使 transforms 与
  // papers/patents/copyrights 一样拒绝空 body(此前空 {} 会建出垃圾记录)。
  @IsString()
  @IsNotEmpty({ message: '交易对方(partner)不能为空' })
  @MaxLength(255)
  partner!: string;
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
