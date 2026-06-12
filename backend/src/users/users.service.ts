import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { Department } from '../departments/entities/department.entity';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`用户 #${id} 不存在`);
    return u;
  }

  async findOne(id: number): Promise<PublicUser> {
    const user = await this.findById(id);
    return this.toPublicUser(user);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.repo.find({ order: { createTime: 'DESC' } });
    return users.map((u) => this.toPublicUser(u));
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const exists = await this.repo.findOne({
      where: { username: dto.username },
    });
    if (exists) throw new ConflictException('用户名已存在');
    if (dto.deptId !== undefined && dto.deptId !== null)
      await this.ensureDeptExists(dto.deptId);
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      ...dto,
      password: hash,
      deptId: dto.deptId ?? null,
      realName: dto.realName ?? null,
      email: dto.email ?? null,
    });
    const saved = await this.repo.save(user);
    return this.toPublicUser(saved);
  }

  async update(id: number, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.findById(id);
    if (dto.deptId !== undefined && dto.deptId !== null)
      await this.ensureDeptExists(dto.deptId);
    if (dto.password != null) {
      if (dto.password === '') throw new BadRequestException('密码不能为空');
      dto.password = await bcrypt.hash(dto.password, 10);
    } else {
      // password 为 null/undefined 时不更新密码字段
      delete (dto as Partial<UpdateUserDto>).password;
    }
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    return this.toPublicUser(saved);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const user = await this.findById(id);
    if (user.username === 'admin')
      throw new BadRequestException('默认管理员不能删除');
    const sysAdminCount = await this.repo.count({
      where: { role: UserRole.SYS_ADMIN, isActive: true },
    });
    if (user.role === UserRole.SYS_ADMIN && sysAdminCount <= 1)
      throw new BadRequestException('至少保留一个启用的系统管理员');
    await this.repo.remove(user);
    return { deleted: true, id };
  }

  /** 启动时若无用户则播种默认账号:每个角色一个,便于权限测试 */
  async seedAdmin(): Promise<void> {
    // 注:改为"按用户名补齐缺失账号",而非"库非空就整体跳过"。
    // 否则历史库里只要有 admin,其余角色测试账号永远不会被创建。

    // 1) 先建两个部门(计算机所、电子所)
    let deptCs = await this.deptRepo.findOne({
      where: { name: '计算机研究所' },
    });
    if (!deptCs) {
      deptCs = await this.deptRepo.save(
        this.deptRepo.create({
          name: '计算机研究所',
          parentId: null,
          description: '示例部门',
        }),
      );
    }
    let deptEe = await this.deptRepo.findOne({
      where: { name: '电子工程研究所' },
    });
    if (!deptEe) {
      deptEe = await this.deptRepo.save(
        this.deptRepo.create({
          name: '电子工程研究所',
          parentId: null,
          description: '示例部门',
        }),
      );
    }

    // 2) 每个角色播一个测试账号(密码统一 Test@123,除 admin)
    const seeds: Array<{
      username: string;
      password: string;
      realName: string;
      role: UserRole;
      deptId?: number;
    }> = [
      {
        username: 'admin',
        password: 'Admin@123',
        realName: '系统管理员',
        role: UserRole.SYS_ADMIN,
      },
      {
        username: 'leader',
        password: 'Test@123',
        realName: '院领导',
        role: UserRole.LEADER,
      },
      {
        username: 'auditor',
        password: 'Test@123',
        realName: '审计员',
        role: UserRole.AUDITOR,
      },
      {
        username: 'secret',
        password: 'Test@123',
        realName: '涉密管理员',
        role: UserRole.SECRET_ADMIN,
      },
      {
        username: 'cs_admin',
        password: 'Test@123',
        realName: '计算机所管理员',
        role: UserRole.DEPT_ADMIN,
        deptId: deptCs.id,
      },
      {
        username: 'cs_sec',
        password: 'Test@123',
        realName: '计算机所秘书',
        role: UserRole.DEPT_SEC,
        deptId: deptCs.id,
      },
      {
        username: 'cs_user',
        password: 'Test@123',
        realName: '计算机所科研',
        role: UserRole.RESEARCHER,
        deptId: deptCs.id,
      },
      {
        username: 'ee_user',
        password: 'Test@123',
        realName: '电子所科研',
        role: UserRole.RESEARCHER,
        deptId: deptEe.id,
      },
    ];

    const created: typeof seeds = [];
    for (const s of seeds) {
      const exists = await this.repo.findOne({
        where: { username: s.username },
      });
      if (exists) continue; // 已存在则跳过,保证幂等
      await this.create(s);
      created.push(s);
    }
    if (created.length === 0) return;
    console.log('✅ 测试账号已补齐(密码统一 Test@123,管理员 Admin@123):');
    created.forEach((s) =>
      console.log(
        `   - ${s.username.padEnd(10)} / ${s.password.padEnd(10)} (${s.role})`,
      ),
    );
  }

  private async ensureDeptExists(id: number): Promise<void> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`部门 #${id} 不存在`);
  }

  private toPublicUser(user: User): PublicUser {
    const { password, ...rest } = user;
    void password;
    return rest;
  }
}
