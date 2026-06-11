import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  module!: string;

  @IsString()
  action!: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString()
  remark?: string | null;
}
