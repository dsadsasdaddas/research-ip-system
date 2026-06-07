import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fee } from './entities/fee.entity';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Fee])],
  providers: [FeesService],
  controllers: [FeesController],
  exports: [FeesService],
})
export class FeesModule {}
