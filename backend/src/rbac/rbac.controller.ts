import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYS_ADMIN)
@Controller('rbac')
export class RbacController {
  constructor(private svc: RbacService) {}

  // ──── 角色 ────

  @Get('roles')
  findAllRoles() {
    return this.svc.findAllRoles();
  }

  @Get('roles/:id')
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOneRole(id);
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.svc.createRole(dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.svc.updateRole(id, dto);
  }

  // ──── 权限 ────

  @Get('permissions')
  findAllPermissions(@Query('module') module?: string) {
    return this.svc.findAllPermissions(module);
  }

  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.svc.createPermission(dto);
  }

  // ──── 角色权限分配 ────

  @Post('assign-permissions')
  assignPermissions(@Body() dto: AssignPermissionsDto) {
    return this.svc.assignPermissions(dto.roleCode, dto.permissionCodes);
  }

  @Get('roles/:roleCode/permissions')
  getPermissionsForRole(@Param('roleCode') roleCode: string) {
    return this.svc.getPermissionsForRole(roleCode);
  }

  @Get('check-permission')
  async checkPermission(@Query('roleCode') roleCode: string, @Query('permissionCode') permissionCode: string) {
    const allowed = await this.svc.checkPermission(roleCode, permissionCode);
    return { allowed };
  }
}
