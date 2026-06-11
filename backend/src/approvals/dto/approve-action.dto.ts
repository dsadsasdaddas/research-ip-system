import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveActionDto {
  /** 当前要操作的审批节点 ID(必填) */
  @Type(() => Number)
  @IsNumber()
  nodeId!: number;

  @IsOptional()
  @IsString()
  opinion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nextNodeId?: number;
}
