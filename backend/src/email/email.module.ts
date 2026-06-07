import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global() // 全局注册，任何模块注入无需 import
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
