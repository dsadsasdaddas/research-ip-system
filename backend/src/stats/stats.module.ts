import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import { Transform } from '../transforms/entities/transform.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Paper, Patent, Copyright, Transform])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
