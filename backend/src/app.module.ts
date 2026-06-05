import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PapersModule } from './papers/papers.module';

@Module({
  imports: [
    // 读取 .env 文件,全局可用(这样下面能用 process.env.DB_xxx)
    ConfigModule.forRoot({ isGlobal: true }),

    // 连接 MySQL 数据库
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true, // 自动加载我们定义的实体(表)
      synchronize: true, // 开发期:根据实体自动建/改表。⚠️ 生产环境要关掉
    }),
    PapersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
