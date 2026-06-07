import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { AuditLogInterceptor } from './audit-logs/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // 全局审计日志拦截器（§7.4 所有写操作留痕）
  const auditInterceptor = app.get(AuditLogInterceptor);
  app.useGlobalInterceptors(auditInterceptor);

  const usersService = app.get(UsersService);
  await usersService.seedAdmin();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`✅ 后端已启动: http://localhost:${port}`);
}
bootstrap();
