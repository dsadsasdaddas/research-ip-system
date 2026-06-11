import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveActionDto {
  @IsOptional()
  @IsString()
  opinion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nextNodeId?: number;
}
