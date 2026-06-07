import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`用户 #${id} 不存在`);
    return u;
  }

  findAll() {
    return this.repo.find({ order: { createTime: 'DESC' } });
  }

  async create(dto: { username: string; password: string; realName?: string; email?: string; role?: UserRole; deptId?: number }) {
    const exists = await this.repo.findOne({ where: { username: dto.username } });
    if (exists) throw new ConflictException('用户名已存在');
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({ ...dto, password: hash });
    const saved = await this.repo.save(user);
    const { password: _, ...rest } = saved;
    return rest;
  }

  async update(id: number, dto: Partial<{ realName: string; email: string; role: UserRole; deptId: number; isActive: boolean; password: string }>) {
    const user = await this.findById(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    const { password: _, ...rest } = saved;
    return rest;
  }

  /** 系统启动时若无用户则自动创建默认管理员 */
  async seedAdmin() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.create({
        username: 'admin',
        password: 'Admin@123',
        realName: '系统管理员',
        role: UserRole.SYS_ADMIN,
      });
      console.log('✅ 默认管理员已创建: admin / Admin@123');
    }
  }
}
