import { PartialType } from '@nestjs/mapped-types';
import { CreateTransformDto } from './create-transform.dto';

export class UpdateTransformDto extends PartialType(CreateTransformDto) {}
