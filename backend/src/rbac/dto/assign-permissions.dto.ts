import { IsArray, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @IsString()
  roleCode!: string;

  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}
