import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional() @IsString() realName?: string | null;
  @IsOptional() @IsEmail()  email?: string | null;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @Type(() => Number) @IsNumber() deptId?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}
