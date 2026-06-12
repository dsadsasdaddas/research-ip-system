import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const MESSAGE_TYPES = ['system', 'reminder', 'approval', 'report'] as const;

export class CreateNotificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  receiverId?: number;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @IsIn(MESSAGE_TYPES)
  messageType?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sourceId?: number;
}
