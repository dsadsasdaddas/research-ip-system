import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

const APPROVE_MODES = ['single', 'countersign', 'orsign'] as const;

export class CreateNodeDto {
  @Type(() => Number)
  @IsNumber()
  flowId!: number;

  @IsString()
  nodeCode!: string;

  @IsString()
  nodeName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nodeOrder?: number;

  @IsOptional()
  @IsString()
  approverRole?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  approverUserId?: number;

  @IsOptional()
  @IsString()
  @IsIn(APPROVE_MODES)
  approveMode?: string;

  @IsOptional()
  @IsBoolean()
  allowReject?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAddSign?: boolean;
}
