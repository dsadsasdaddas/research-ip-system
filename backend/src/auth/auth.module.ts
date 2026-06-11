import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // 用 registerAsync 在运行时(.env 加载完成后)解析密钥,
    // 否则签名用 fallback、校验用 .env 值,二者不一致会导致所有 token 401。
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          new Logger('AuthModule').warn(
            '⚠️  JWT_SECRET 未设置，使用不安全的默认值！请在 .env 中配置 JWT_SECRET',
          );
        }
        return {
          secret: secret || 'research-mis-secret',
          signOptions: { expiresIn: '8h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
