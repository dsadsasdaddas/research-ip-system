import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional() @IsString() realName?: string;
  @IsOptional() @IsEmail()  email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @Type(() => Number) @IsNumber() deptId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}
