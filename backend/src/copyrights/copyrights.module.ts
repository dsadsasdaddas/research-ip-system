import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Copyright } from './entities/copyright.entity';
import { CopyrightsController } from './copyrights.controller';
import { CopyrightsService } from './copyrights.service';

@Module({
  imports: [TypeOrmModule.forFeature([Copyright])],
  controllers: [CopyrightsController],
  providers: [CopyrightsService],
})
export class CopyrightsModule {}
