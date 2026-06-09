import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transform } from './entities/transform.entity';
import { TransformsController } from './transforms.controller';
import { TransformsService } from './transforms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transform])],
  controllers: [TransformsController],
  providers: [TransformsService],
  exports: [TransformsService],
})
export class TransformsModule {}
