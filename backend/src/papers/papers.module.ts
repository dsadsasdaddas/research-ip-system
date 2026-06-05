import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';
import { PapersController } from './papers.controller';
import { PapersService } from './papers.service';

/**
 * 论文模块:把实体、Service、Controller 组装在一起。
 */
@Module({
  imports: [TypeOrmModule.forFeature([Paper])],
  controllers: [PapersController],
  providers: [PapersService],
})
export class PapersModule {}
