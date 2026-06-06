import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateCopyrightDto } from './dto/create-copyright.dto';
import { UpdateCopyrightDto } from './dto/update-copyright.dto';
import { Copyright } from './entities/copyright.entity';

/** 软著业务逻辑(套路和论文/专利一致)。 */
@Injectable()
export class CopyrightsService {
  constructor(
    @InjectRepository(Copyright)
    private readonly repo: Repository<Copyright>,
  ) {}

  create(dto: CreateCopyrightDto) {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(keyword?: string) {
    return this.repo.find({
      where: keyword ? { name: Like(`%${keyword}%`) } : {},
      order: { createTime: 'DESC' },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`软著 #${id} 不存在`);
    }
    return item;
  }

  async update(id: number, dto: UpdateCopyrightDto) {
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
