import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly repo: Repository<Department>,
  ) {}

  findAll(keyword?: string): Promise<Department[]> {
    return this.repo.find({
      where: keyword ? { name: Like(`%${keyword}%`) } : {},
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Department> {
    const dept = await this.repo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`部门 #${id} 不存在`);
    return dept;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    await this.ensureNameAvailable(dto.name);
    if (dto.parentId !== undefined && dto.parentId !== null)
      await this.findOne(dto.parentId);
    const dept = this.repo.create({
      name: dto.name,
      parentId: dto.parentId ?? null,
      description: dto.description ?? null,
    });
    return this.repo.save(dept);
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findOne(id);
    if (dto.name && dto.name !== dept.name)
      await this.ensureNameAvailable(dto.name);
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id)
        throw new BadRequestException('上级部门不能是自己');
      await this.findOne(dto.parentId);
    }
    Object.assign(dept, dto);
    return this.repo.save(dept);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const dept = await this.findOne(id);
    const childCount = await this.repo.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('存在下级部门，不能删除');
    await this.repo.remove(dept);
    return { deleted: true, id };
  }

  private async ensureNameAvailable(name: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { name } });
    if (exists) throw new ConflictException('部门名称已存在');
  }
}
