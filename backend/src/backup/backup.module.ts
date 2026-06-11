import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupLog } from './entities/backup-log.entity';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BackupLog])],
  providers: [BackupService],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule {}
