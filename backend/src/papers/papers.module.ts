import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';

/**
 * 论文模块。
 * TypeOrmModule.forFeature([Paper]) 把 Paper 实体注册进来,
 * 这样本模块里就能注入"论文仓库(Repository)"来读写 paper 表。
 */
@Module({
  imports: [TypeOrmModule.forFeature([Paper])],
})
export class PapersModule {}
