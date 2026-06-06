import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patent } from './entities/patent.entity';
import { PatentsController } from './patents.controller';
import { PatentsService } from './patents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patent])],
  controllers: [PatentsController],
  providers: [PatentsService],
})
export class PatentsModule {}
