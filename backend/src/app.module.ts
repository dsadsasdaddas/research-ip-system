import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PapersModule } from './papers/papers.module';
import { PatentsModule } from './patents/patents.module';
import { CopyrightsModule } from './copyrights/copyrights.module';
import { TransformsModule } from './transforms/transforms.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuthModule } from './auth/auth.module';
import { FeesModule } from './fees/fees.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { RemindersModule } from './reminders/reminders.module';
import { EmailModule } from './email/email.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    PapersModule,
    PatentsModule,
    CopyrightsModule,
    TransformsModule,
    StatsModule,
    UsersModule,
    DepartmentsModule,
    AuthModule,
    FeesModule,
    AuditLogsModule,
    RemindersModule,
    EmailModule,
    AttachmentsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
