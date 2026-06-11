import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RustSearchAdapter } from './rust-search-adapter';
import { SearchLogsModule } from '../search-logs/search-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paper, Patent, Copyright]),
    SearchLogsModule,
  ],
  providers: [SearchService, RustSearchAdapter],
  controllers: [SearchController],
})
export class SearchModule {}
