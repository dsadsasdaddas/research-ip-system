import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RbacRole } from './entities/rbac-role.entity';
import { RbacPermission } from './entities/rbac-permission.entity';
import { RbacRolePermission } from './entities/rbac-role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(RbacRole) private roleRepo: Repository<RbacRole>,
    @InjectRepository(RbacPermission)
    private permRepo: Repository<RbacPermission>,
    @InjectRepository(RbacRolePermission)
    private rpRepo: Repository<RbacRolePermission>,
  ) {}

  // ──── 角色 CRUD ────

  async findAllRoles(): Promise<RbacRole[]> {
    return this.roleRepo.find({ order: { id: 'ASC' } });
  }

  async findOneRole(id: number): Promise<RbacRole> {
    const role = await this.roleRepo.findOneBy({ id });
    if (!role) throw new NotFoundException(`角色 #${id} 不存在`);
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<RbacRole> {
    const entity = this.roleRepo.create(dto);
    return this.roleRepo.save(entity);
  }

  async updateRole(id: number, dto: UpdateRoleDto): Promise<RbacRole> {
    const role = await this.findOneRole(id);
    if (role.isSystem) {
      throw new BadRequestException('系统内置角色不可修改');
    }
    Object.assign(role, dto);
    return this.roleRepo.save(role);
  }

  // ──── 权限 CRUD ────

  async findAllPermissions(module?: string): Promise<RbacPermission[]> {
    const where: Record<string, string> = {};
    if (module) where.module = module;
    return this.permRepo.find({ where, order: { id: 'ASC' } });
  }

  async createPermission(dto: CreatePermissionDto): Promise<RbacPermission> {
    const entity = this.permRepo.create(dto);
    return this.permRepo.save(entity);
  }

  // ──── 角色权限分配 ────

  /** 分配权限给角色：先删除旧关联，再批量插入 */
  async assignPermissions(
    roleCode: string,
    permissionCodes: string[],
  ): Promise<void> {
    await this.rpRepo.delete({ roleCode });
    if (permissionCodes.length > 0) {
      const entities = permissionCodes.map((pc) =>
        this.rpRepo.create({ roleCode, permissionCode: pc }),
      );
      await this.rpRepo.save(entities);
    }
  }

  /** 获取角色拥有的权限列表 */
  async getPermissionsForRole(roleCode: string): Promise<RbacPermission[]> {
    const rps = await this.rpRepo.find({ where: { roleCode } });
    if (rps.length === 0) return [];
    const codes = rps.map((rp) => rp.permissionCode);
    return this.permRepo
      .createQueryBuilder('p')
      .where('p.code IN (:...codes)', { codes })
      .orderBy('p.module', 'ASC')
      .addOrderBy('p.action', 'ASC')
      .getMany();
  }

  /** 检查角色是否拥有指定权限 */
  async checkPermission(
    roleCode: string,
    permissionCode: string,
  ): Promise<boolean> {
    const count = await this.rpRepo.count({
      where: { roleCode, permissionCode },
    });
    return count > 0;
  }
}
