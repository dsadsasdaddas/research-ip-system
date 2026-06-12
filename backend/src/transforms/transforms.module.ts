import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transform } from './entities/transform.entity';
import { TransformDistribution } from './entities/transform-distribution.entity';
import {
  TransformsController,
  TransformDistributionsController,
} from './transforms.controller';
import { TransformsService } from './transforms.service';
import { TransformDistributionsService } from './transform-distributions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transform, TransformDistribution])],
  controllers: [TransformsController, TransformDistributionsController],
  providers: [TransformsService, TransformDistributionsService],
  exports: [TransformsService, TransformDistributionsService],
})
export class TransformsModule {}
