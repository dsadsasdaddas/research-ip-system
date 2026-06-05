import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 允许前端(Vue 跑在 5173 端口)跨域访问本后端
  app.enableCors();

  // 全局入参校验:whitelist 自动剔除多余字段,transform 自动转换类型
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // 后端端口:用 3001(本机 3000 被 One API 占用,务必避开)
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`✅ 后端已启动: http://localhost:${port}`);
}
bootstrap();
