import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuditLogInterceptor } from './../src/audit-logs/audit-log.interceptor';
import { UsersService } from './../src/users/users.service';

/**
 * 启动一个与 main.ts 完全一致配置的测试用 Nest 应用:
 *   - 全局前缀 /api
 *   - 全局 ValidationPipe(whitelist + transform)
 *   - 全局 AuditLogInterceptor
 *   - 启动后补齐测试账号(seedAdmin,幂等)
 * 这样 e2e 打到的行为 == 真实线上行为。
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(app.get(AuditLogInterceptor));

  await app.init();

  // 确保测试账号存在(管理员 + 各角色),否则登录拿不到 token
  await app.get(UsersService).seedAdmin();
  return app;
}

/** 测试账号清单(与 seedAdmin 一致),密码:admin 用 Admin@123,其余 Test@123。 */
export const ACCOUNTS = {
  admin:    { username: 'admin',    password: 'Admin@123', role: 'sys_admin' },
  leader:   { username: 'leader',   password: 'Test@123',  role: 'leader' },
  auditor:  { username: 'auditor',  password: 'Test@123',  role: 'auditor' },
  secret:   { username: 'secret',   password: 'Test@123',  role: 'secret_admin' },
  csAdmin:  { username: 'cs_admin', password: 'Test@123',  role: 'dept_admin' },
  csSec:    { username: 'cs_sec',   password: 'Test@123',  role: 'dept_secretary' },
  csUser:   { username: 'cs_user',  password: 'Test@123',  role: 'researcher' },
  eeUser:   { username: 'ee_user',  password: 'Test@123',  role: 'researcher' },
} as const;

/** 用账号登录,返回 JWT。失败会抛出,便于测试早发现。 */
export async function login(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username, password });
  if (res.status !== 201 || !res.body.token) {
    throw new Error(`login failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

/** 给请求加 Bearer 头的小工具。 */
export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
