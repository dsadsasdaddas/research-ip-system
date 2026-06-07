import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Paper, Patent, Copyright])],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
