import { IsString, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const REMIND_LEVELS  = ['普通', '重要', '紧急'] as const;
const TARGET_TYPES   = ['paper', 'patent', 'copyright', 'transform', 'rule'] as const;

export class CreateReminderTaskDto {
  @IsString() title!: string;

  @IsOptional() @IsString() @IsIn(TARGET_TYPES) targetType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() targetId?: number;

  @IsOptional() @IsString() remindDate?: string;
  @IsOptional() @IsString() deadline?: string;

  @IsOptional() @IsString() @IsIn(REMIND_LEVELS) remindLevel?: string;

  @IsOptional() @Type(() => Number) @IsNumber() receiverId?: number;
  @IsOptional() @IsString() receiverName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() deptId?: number;
  @IsOptional() @IsString() remark?: string;
}
