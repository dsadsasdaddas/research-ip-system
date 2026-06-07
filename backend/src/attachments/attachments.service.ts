import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AttachmentsService {
  constructor(@InjectRepository(Attachment) private repo: Repository<Attachment>) {}

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

  async list(relationType: string, relationId: number) {
    return this.repo.find({
      where: { relationType, relationId },
      order: { createTime: 'DESC' },
    });
  }

  async findOne(id: number) {
    const att = await this.repo.findOneBy({ id });
    if (!att) throw new NotFoundException('附件不存在');
    return att;
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
