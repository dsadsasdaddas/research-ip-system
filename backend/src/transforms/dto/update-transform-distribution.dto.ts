import { PartialType } from '@nestjs/mapped-types';
import { CreateTransformDistributionDto } from './create-transform-distribution.dto';

export class UpdateTransformDistributionDto extends PartialType(
  CreateTransformDistributionDto,
) {}
