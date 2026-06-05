import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { Paper } from './entities/paper.entity';

/**
 * 论文业务逻辑:真正读写数据库的地方。
 */
@Injectable()
export class PapersService {
  constructor(
    // 注入"论文仓库(Repository)",用它来增删改查 paper 表
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
  ) {}

  /** 新增论文 */
  create(dto: CreatePaperDto) {
    const paper = this.paperRepo.create(dto); // DTO -> 实体对象
    return this.paperRepo.save(paper); // 存入数据库
  }

  /** 查询列表;传了 keyword 就按标题模糊搜 */
  findAll(keyword?: string) {
    return this.paperRepo.find({
      where: keyword ? { title: Like(`%${keyword}%`) } : {},
      order: { createTime: 'DESC' }, // 最新登记的排最前
    });
  }

  /** 查单条;不存在抛 404 */
  async findOne(id: number) {
    const paper = await this.paperRepo.findOne({ where: { id } });
    if (!paper) {
      throw new NotFoundException(`论文 #${id} 不存在`);
    }
    return paper;
  }

  /** 更新 */
  async update(id: number, dto: UpdatePaperDto) {
    const paper = await this.findOne(id); // 先确认存在
    Object.assign(paper, dto); // 合并改动
    return this.paperRepo.save(paper);
  }

  /** 删除 */
  async remove(id: number) {
    const paper = await this.findOne(id);
    await this.paperRepo.remove(paper);
    return { deleted: true, id };
  }
}
