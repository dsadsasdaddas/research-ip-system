import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IntegrationType } from '../entities/integration-config.entity';

export class IntegrationLogsQueryDto {
  @IsOptional()
  @IsEnum(IntegrationType)
  type?: IntegrationType;

  @IsOptional()
  @Transform(({ value }: { value: string | boolean | undefined }) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  })
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
