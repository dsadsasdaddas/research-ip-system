import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 附件表：关联论文/专利/软著/转化/费用凭证 */
@Entity('attachment')
export class Attachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'relation_type', length: 50, nullable: true, comment: 'paper/patent/copyright/transform/fee' })
  relationType!: string | null;

  @Column({ name: 'relation_id', type: 'int', nullable: true, comment: '关联业务ID' })
  relationId!: number | null;

  @Column({ name: 'file_name', length: 255, comment: '存储文件名（唯一）' })
  fileName!: string;

  @Column({ name: 'original_name', length: 255, comment: '原始文件名' })
  originalName!: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true, comment: '文件字节数' })
  fileSize!: number | null;

  @Column({ type: 'varchar', name: 'mime_type', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'file_path', length: 500, comment: '磁盘相对路径' })
  filePath!: string;

  @Column({ name: 'version', type: 'int', default: 1, comment: '版本号' })
  version!: number;

  @Column({ type: 'varchar', name: 'upload_user', length: 100, nullable: true })
  uploadUser!: string | null;

  @Column({ type: 'varchar', nullable: true })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
