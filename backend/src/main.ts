import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { AuditLogInterceptor } from './audit-logs/audit-log.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestContextInterceptor } from './common/utils/request-context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 全局审计日志拦截器（§7.4 所有写操作留痕）
  const auditInterceptor = app.get(AuditLogInterceptor);
  // 请求上下文拦截器：把请求 IP 写入 AsyncLocalStorage，供字段级审计 subscriber 读取
  app.useGlobalInterceptors(new RequestContextInterceptor(), auditInterceptor);

  // 全局异常过滤器：统一错误响应 shape { statusCode, message, error, timestamp }
  app.useGlobalFilters(new AllExceptionsFilter());

  const usersService = app.get(UsersService);
  await usersService.seedAdmin();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`✅ 后端已启动: http://localhost:${port}`);
}
bootstrap();
