import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateTransformDto } from './dto/create-transform.dto';
import { UpdateTransformDto } from './dto/update-transform.dto';
import { Transform } from './entities/transform.entity';

@Injectable()
export class TransformsService {
  constructor(
    @InjectRepository(Transform)
    private readonly repo: Repository<Transform>,
  ) {}

  create(dto: CreateTransformDto) {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(keyword?: string) {
    return this.repo.find({
      where: keyword ? { partner: Like(`%${keyword}%`) } : {},
      order: { createTime: 'DESC' },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`转化项目 #${id} 不存在`);
    return item;
  }

  async update(id: number, dto: UpdateTransformDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { deleted: true, id };
  }
}
