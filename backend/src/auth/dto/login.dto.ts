import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * 登录入参 DTO(§3 认证)。
 * 用 class 而非内联类型,使全局 ValidationPipe 能据 class-validator 元数据校验:
 * 缺字段/空字符串/类型不符 → 400,而非把 undefined 透传到 service 触发 500。
 */
export class LoginDto {
  /** 登录用户名(必填) */
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(100)
  username!: string;

  /** 登录密码(必填) */
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MaxLength(128)
  password!: string;
}
