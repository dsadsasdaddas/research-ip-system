import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderTask } from './entities/reminder-task.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReminderTask, ReminderRule])],
  providers: [RemindersService],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}
