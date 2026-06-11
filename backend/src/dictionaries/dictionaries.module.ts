import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictionariesController } from './dictionaries.controller';
import { DictionariesService } from './dictionaries.service';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { DictionaryType } from './entities/dictionary-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DictionaryType, DictionaryItem])],
  controllers: [DictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule {}
