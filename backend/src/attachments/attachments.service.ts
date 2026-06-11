import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import * as fs from 'fs';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment) private repo: Repository<Attachment>,
    private dataSource: DataSource,
  ) {}

  async saveFile(
    file: Express.Multer.File,
    relationType: string,
    relationId: number,
    uploadUser: string,
    remark?: string,
  ) {
    // 计算版本号：同成果同文件名的历史版本
    const lastVer = await this.repo
      .createQueryBuilder('a')
      .where('a.relation_type = :rt AND a.relation_id = :rid AND a.original_name = :on', {
        rt: relationType, rid: relationId, on: file.originalname,
      })
      .orderBy('a.version', 'DESC')
      .getOne();

    const version = lastVer ? lastVer.version + 1 : 1;

    const att = this.repo.create({
      relationType,
      relationId,
      fileName:     file.filename,
      originalName: file.originalname,
      fileSize:     file.size,
      mimeType:     file.mimetype,
      filePath:     file.path,
      version,
      uploadUser,
      remark,
    });
    return this.repo.save(att);
  }

  async list(relationType?: string, relationId?: number) {
    // 仅把"有值"的条件放进 where:不传过滤参数时返回全部,
    // 否则把 undefined/NaN 塞进 where 会让新版 TypeORM 直接报错(500)。
    const where: { relationType?: string; relationId?: number } = {};
    if (relationType) where.relationType = relationType;
    if (relationId !== undefined && !Number.isNaN(relationId)) where.relationId = relationId;
    return this.repo.find({
      where,
      order: { createTime: 'DESC' },
    });
  }

  async findOne(id: number) {
    const att = await this.repo.findOneBy({ id });
    if (!att) throw new NotFoundException('附件不存在');
    return att;
  }

  /** 检查当前用户是否有权访问该附件（密级 + 部门） */
  async checkAccess(att: Attachment, user: AuthUser): Promise<void> {
    // 密级检查
    const allowedLevels = getSecretLevels(user);
    if (att.secretLevel && !allowedLevels.includes(att.secretLevel)) {
      throw new ForbiddenException('无权访问该附件');
    }
    // 部门检查：附件关联的成果有所属部门，部门隔离角色只能访问本部门附件
    const deptId = getDeptFilter(user);
    if (deptId != null && att.relationId && att.relationType) {
      const relatedDeptId = await this.getRelatedDeptId(att.relationType, att.relationId);
      if (relatedDeptId != null && relatedDeptId !== deptId) {
        throw new ForbiddenException('无权访问该附件');
      }
    }
  }

  /** 根据关联类型和 ID 查询对应成果的 deptId */
  private async getRelatedDeptId(relationType: string, relationId: number): Promise<number | null> {
    const tableMap: Record<string, string> = {
      paper: 'paper', patent: 'patent', copyright: 'copyright',
      transform: 'transform', fee: 'fee',
    };
    const table = tableMap[relationType];
    if (!table) return null;
    try {
      const row = await this.dataSource
        .createQueryBuilder()
        .select('dept_id', 'deptId')
        .from(table, 't')
        .where('t.id = :id', { id: relationId })
        .getRawOne();
      return row?.deptId ?? null;
    } catch {
      return null;
    }
  }

  async remove(id: number) {
    const att = await this.findOne(id);
    // 删除磁盘文件
    if (fs.existsSync(att.filePath)) {
      fs.unlinkSync(att.filePath);
    }
    await this.repo.delete(id);
    return { success: true };
  }
}
