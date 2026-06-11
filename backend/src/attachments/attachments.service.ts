import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    user: AuthUser,
    remark?: string,
  ): Promise<Attachment> {
    try {
      await this.checkRelationAccess(relationType, relationId, user);
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw err;
    }

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
      uploadUser:   user.username,
      remark,
    });
    return this.repo.save(att);
  }

  async list(relationType: string | undefined, relationId: number | undefined, user: AuthUser): Promise<Attachment[]> {
    // 仅把"有值"的条件放进 where:不传过滤参数时返回全部,
    // 否则把 undefined/NaN 塞进 where 会让新版 TypeORM 直接报错(500)。
    const where: { relationType?: string; relationId?: number } = {};
    if (relationType) where.relationType = relationType;
    if (relationId !== undefined && !Number.isNaN(relationId)) where.relationId = relationId;
    const rows = await this.repo.find({
      where,
      order: { createTime: 'DESC' },
    });
    const visible: Attachment[] = [];
    for (const att of rows) {
      if (await this.canAccess(att, user)) visible.push(att);
    }
    return visible;
  }

  async findOne(id: number) {
    const att = await this.repo.findOneBy({ id });
    if (!att) throw new NotFoundException('附件不存在');
    return att;
  }

  /** 检查当前用户是否有权访问该附件（密级 + 部门） */
  async checkAccess(att: Attachment, user: AuthUser): Promise<void> {
    if (!(await this.canAccess(att, user))) {
      throw new ForbiddenException('无权访问该附件');
    }
  }

  private async canAccess(att: Attachment, user: AuthUser): Promise<boolean> {
    // 密级检查
    const allowedLevels = getSecretLevels(user);
    if (att.secretLevel && !allowedLevels.includes(att.secretLevel)) {
      return false;
    }
    // 部门检查：附件关联的成果有所属部门，部门隔离角色只能访问本部门附件
    const deptId = getDeptFilter(user);
    if (deptId != null) {
      if (!att.relationId || !att.relationType) {
        return att.uploadUser === user.username;
      }
      const relatedDeptId = await this.getRelatedDeptId(att.relationType, att.relationId);
      if (relatedDeptId == null) return false;
      if (relatedDeptId !== deptId) return false;
    }
    return true;
  }

  private async checkRelationAccess(relationType: string, relationId: number, user: AuthUser): Promise<void> {
    if (!relationType || Number.isNaN(relationId)) {
      throw new BadRequestException('附件关联对象不能为空');
    }
    const deptId = getDeptFilter(user);
    if (deptId == null) return;
    const relatedDeptId = await this.getRelatedDeptId(relationType, relationId);
    if (relatedDeptId == null || relatedDeptId !== deptId) {
      throw new ForbiddenException('无权为该成果上传附件');
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
        .getRawOne<{ deptId: number | null }>();
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
