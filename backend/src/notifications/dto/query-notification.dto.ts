import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const MESSAGE_TYPES = ['system', 'reminder', 'approval', 'report'] as const;

export class QueryNotificationDto {
  @IsOptional() @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number;

  @IsOptional() @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRead?: boolean;

  @IsOptional() @IsString() @IsIn(MESSAGE_TYPES)
  messageType?: string;
}
