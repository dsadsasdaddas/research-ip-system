import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreatePatentDto } from './dto/create-patent.dto';
import { UpdatePatentDto } from './dto/update-patent.dto';
import { Patent } from './entities/patent.entity';

/** 专利业务逻辑:真正读写数据库的地方(套路和论文模块一致)。 */
@Injectable()
export class PatentsService {
  constructor(
    @InjectRepository(Patent)
    private readonly repo: Repository<Patent>,
  ) {}

  /** 新增 */
  create(dto: CreatePatentDto) {
    return this.repo.save(this.repo.create(dto));
  }

  /** 列表;传了 keyword 就按专利名称模糊搜 */
  findAll(keyword?: string) {
    return this.repo.find({
      where: keyword ? { name: Like(`%${keyword}%`) } : {},
      order: { createTime: 'DESC' },
    });
  }

  /** 查单条;不存在抛 404 */
  async findOne(id: number) {
    const patent = await this.repo.findOne({ where: { id } });
    if (!patent) {
      throw new NotFoundException(`专利 #${id} 不存在`);
    }
    return patent;
  }

  /** 更新 */
  async update(id: number, dto: UpdatePatentDto) {
    const patent = await this.findOne(id);
    Object.assign(patent, dto);
    return this.repo.save(patent);
  }

  /** 删除 */
  async remove(id: number) {
    const patent = await this.findOne(id);
    await this.repo.remove(patent);
    return { deleted: true, id };
  }
}
