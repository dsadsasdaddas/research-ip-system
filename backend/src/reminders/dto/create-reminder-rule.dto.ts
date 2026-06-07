import { IsString, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const REMIND_TYPES  = ['项目申报', '奖项申报', '专利年费', '软著维护', '成果转化后评估', '涉密成果核查'] as const;
const REMIND_LEVELS = ['普通', '重要', '紧急'] as const;

export class CreateReminderRuleDto {
  @IsString() title!: string;

  @IsOptional() @IsString() @IsIn(REMIND_TYPES) remindType?: string;
  @IsOptional() @IsString() deadline?: string;

  @IsOptional() @Type(() => Number) @IsNumber() daysBefore?: number;
  @IsOptional() @IsString() @IsIn(REMIND_LEVELS) remindLevel?: string;

  @IsOptional() @Type(() => Number) @IsNumber() deptId?: number;
  @IsOptional() @IsString() receiverIds?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
