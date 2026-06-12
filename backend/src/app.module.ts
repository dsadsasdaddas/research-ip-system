import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { IntegrationsModule } from './integrations/integrations.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { SearchLogsModule } from './search-logs/search-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ReportsModule } from './reports/reports.module';
import { RbacModule } from './rbac/rbac.module';
import { SecretAccessModule } from './secret-access/secret-access.module';
import { BackupModule } from './backup/backup.module';
import { CacheModule } from './cache/cache.module';
import { AuditChangeSubscriber } from './common/subscribers/audit-change.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNC === 'true',
      // §6.2 字段级变更日志 subscriber(paper/patent/copyright/transform 的 update/delete)
      subscribers: [AuditChangeSubscriber],
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
    IntegrationsModule,
    DictionariesModule,
    SearchLogsModule,
    NotificationsModule,
    ApprovalsModule,
    ReportsModule,
    RbacModule,
    SecretAccessModule,
    BackupModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
