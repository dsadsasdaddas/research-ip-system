import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 附件版本表：记录附件的每个历史版本 */
@Entity('attachment_version')
export class AttachmentVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'attachment_id', type: 'int', comment: '附件ID' })
  attachmentId!: number;

  @Column({ name: 'version', type: 'int', comment: '版本号' })
  version!: number;

  @Column({ name: 'file_name', length: 255, comment: '存储文件名' })
  fileName!: string;

  @Column({ name: 'original_name', length: 255, comment: '原始文件名' })
  originalName!: string;

  @Column({
    name: 'file_size',
    type: 'bigint',
    nullable: true,
    comment: '文件大小',
  })
  fileSize!: number | null;

  @Column({ type: 'varchar', name: 'mime_type', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'file_path', length: 500, comment: '文件路径' })
  filePath!: string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '文件校验和',
  })
  checksum!: string | null;

  @Column({ type: 'varchar', name: 'upload_user', length: 100, nullable: true })
  uploadUser!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
