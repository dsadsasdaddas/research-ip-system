import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockDataSource,
  mockAuthUser,
  MockObject,
} from '../testing/mocks';
import type { Repository, DataSource } from 'typeorm';
import type { Attachment } from './entities/attachment.entity';
import type { AttachmentVersion } from './entities/attachment-version.entity';
import type { AttachmentAccessLog } from './entities/attachment-access-log.entity';
import { UserRole } from '../users/entities/user.entity';
import * as fs from 'fs';

jest.mock('fs');
const fsMock = fs as jest.Mocked<typeof fs>;

function mockFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'report.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    destination: '/uploads',
    filename: '123-report.pdf',
    path: '/uploads/123-report.pdf',
    size: 1024,
    stream: null as never,
    buffer: Buffer.from(''),
    ...overrides,
  };
}

describe('AttachmentsService', () => {
  let repo: ReturnType<typeof mockRepository>;
  let versionRepo: ReturnType<typeof mockRepository>;
  let accessLogRepo: ReturnType<typeof mockRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;
  let service: AttachmentsService;

  beforeEach(() => {
    repo = mockRepository();
    versionRepo = mockRepository();
    accessLogRepo = mockRepository();
    dataSource = mockDataSource();
    service = new AttachmentsService(
      repo as unknown as Repository<Attachment>,
      versionRepo as unknown as Repository<AttachmentVersion>,
      accessLogRepo as unknown as Repository<AttachmentAccessLog>,
      dataSource as unknown as DataSource,
    );
    fsMock.existsSync.mockReset();
    fsMock.unlinkSync.mockReset();
  });

  describe('saveFile', () => {
    it('全院角色 + 首次上传 → version=1 并保存', async () => {
      // checkRelationAccess 对全院角色直接 return(getDeptFilter=undefined)
      // 版本查询返回 null
      const qb = mockQueryBuilder({
        getOne: jest.fn().mockResolvedValue(null),
      });
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const att = await service.saveFile(
        mockFile(),
        'paper',
        1,
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(repo.save).toHaveBeenCalled();
      expect((att as Record<string, unknown>).version).toBe(1);
      expect((att as Record<string, unknown>).filePath).toBe(
        '/uploads/123-report.pdf',
      );
    });

    it('存在历史版本 → version 递增', async () => {
      const qb = mockQueryBuilder({
        getOne: jest.fn().mockResolvedValue({ version: 3 }),
      });
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const att = await service.saveFile(
        mockFile(),
        'paper',
        1,
        mockAuthUser(UserRole.SYS_ADMIN),
        '备注',
      );
      expect((att as Record<string, unknown>).version).toBe(4);
      expect((att as Record<string, unknown>).remark).toBe('备注');
    });

    it('关联对象为空 → 400', async () => {
      await expect(
        service.saveFile(mockFile(), '', 1, mockAuthUser(UserRole.SYS_ADMIN)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('关联对象 NaN → 400', async () => {
      await expect(
        service.saveFile(
          mockFile(),
          'paper',
          Number.NaN,
          mockAuthUser(UserRole.SYS_ADMIN),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('checkRelationAccess 抛 ForbiddenException → 删除已上传的文件并重抛', async () => {
      fsMock.existsSync.mockReturnValue(true);
      // 部门隔离角色 + getRelatedDeptId 返回不匹配 → ForbiddenException
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ deptId: 999 }),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      await expect(
        service.saveFile(
          mockFile(),
          'paper',
          1,
          mockAuthUser(UserRole.RESEARCHER, 5),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fsMock.unlinkSync).toHaveBeenCalledWith('/uploads/123-report.pdf');
    });

    it('checkRelationAccess 抛错且文件不存在 → 不调 unlinkSync', async () => {
      fsMock.existsSync.mockReturnValue(false);
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue(null),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      await expect(
        service.saveFile(
          mockFile(),
          'paper',
          1,
          mockAuthUser(UserRole.RESEARCHER, 5),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fsMock.unlinkSync).not.toHaveBeenCalled();
    });

    it('部门隔离角色 + 关联成果同部门 → 允许上传', async () => {
      const verQb = mockQueryBuilder({
        getOne: jest.fn().mockResolvedValue(null),
      });
      const deptQb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ deptId: 5 }),
      });
      // createQueryBuilder 第一次被 saveFile 的版本查询用,第二次被 getRelatedDeptId 用
      repo.createQueryBuilder = jest.fn().mockReturnValue(verQb);
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(deptQb);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const att = await service.saveFile(
        mockFile(),
        'paper',
        1,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect((att as Record<string, unknown>).version).toBe(1);
    });
  });

  describe('list', () => {
    it('无过滤参数 → 查全部 + canAccess 过滤', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: null,
          relationId: null,
          uploadUser: 'test',
        },
        {
          id: 2,
          secretLevel: '涉密',
          relationType: null,
          relationId: null,
          uploadUser: 'test',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      // RESEARCHER 只能看公开 → 仅 1 条
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createTime: 'DESC' },
      });
    });

    it('带 relationType + relationId → where 带条件', async () => {
      repo.find.mockResolvedValue([]);
      await service.list('paper', 7, mockAuthUser(UserRole.SYS_ADMIN));
      expect(repo.find).toHaveBeenCalledWith({
        where: { relationType: 'paper', relationId: 7 },
        order: { createTime: 'DESC' },
      });
    });

    it('relationId 为 NaN → 不进 where', async () => {
      repo.find.mockResolvedValue([]);
      await service.list('paper', Number.NaN, mockAuthUser(UserRole.SYS_ADMIN));
      expect(repo.find).toHaveBeenCalledWith({
        where: { relationType: 'paper' },
        order: { createTime: 'DESC' },
      });
    });

    it('部门隔离角色 + 附件有成果 + 同部门 → canAccess 返回 true', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ deptId: 5 }),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: 'paper',
          relationId: 1,
          uploadUser: 'x',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(1);
    });

    it('部门隔离角色 + 关联成果不同部门 → 过滤掉', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ deptId: 999 }),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: 'paper',
          relationId: 1,
          uploadUser: 'x',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(0);
    });

    it('部门隔离角色 + 关联成果 deptId 为 null → 过滤掉', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ deptId: null }),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: 'paper',
          relationId: 1,
          uploadUser: 'x',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(0);
    });

    it('部门隔离角色 + 附件无关联(relationId/type 空) + 是本人上传 → 可见', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: null,
          relationId: null,
          uploadUser: 'test',
        },
        {
          id: 2,
          secretLevel: '公开',
          relationType: null,
          relationId: null,
          uploadUser: 'other',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
    });

    it('密级不在允许范围 → canAccess false', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '涉密',
          relationType: null,
          relationId: null,
          uploadUser: 'test',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(0);
    });
  });

  describe('findOne / checkAccess', () => {
    it('不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('存在 → 返回', async () => {
      const att = { id: 1, secretLevel: '公开' } as Attachment;
      repo.findOneBy.mockResolvedValue(att);
      await expect(service.findOne(1)).resolves.toBe(att);
    });

    it('checkAccess 通过 → 不抛(全院角色)', async () => {
      const att = {
        id: 1,
        secretLevel: '涉密',
        relationType: 'paper',
        relationId: 1,
      } as Attachment;
      await expect(
        service.checkAccess(att, mockAuthUser(UserRole.SYS_ADMIN)),
      ).resolves.toBeUndefined();
    });

    it('checkAccess 不通过 → 403', async () => {
      const att = {
        id: 1,
        secretLevel: '涉密',
        relationType: 'paper',
        relationId: 1,
      } as Attachment;
      await expect(
        service.checkAccess(att, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getRelatedDeptId', () => {
    it('未识别的 relationType → 返回 null(走 tableMap 缺失分支)', async () => {
      // 通过 list 间接调用:relationType=unknown → getRelatedDeptId 返回 null → canAccess false
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: 'unknown',
          relationId: 1,
          uploadUser: 'x',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(0);
    });

    it('dataSource 查询抛错 → catch 返回 null', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockRejectedValue(new Error('db')),
      });
      dataSource.createQueryBuilder = jest.fn().mockReturnValue(qb);
      repo.find.mockResolvedValue([
        {
          id: 1,
          secretLevel: '公开',
          relationType: 'patent',
          relationId: 1,
          uploadUser: 'x',
        },
      ]);
      const res = await service.list(
        undefined,
        undefined,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('文件存在 → 删文件 + 删记录', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, filePath: '/uploads/a.pdf' });
      fsMock.existsSync.mockReturnValue(true);
      const res = await service.remove(1);
      expect(fsMock.unlinkSync).toHaveBeenCalledWith('/uploads/a.pdf');
      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(res).toEqual({ success: true });
    });

    it('文件不存在 → 仅删记录,不调 unlinkSync', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1, filePath: '/uploads/a.pdf' });
      fsMock.existsSync.mockReturnValue(false);
      await service.remove(1);
      expect(fsMock.unlinkSync).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('附件不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getVersions', () => {
    it('附件存在 → 返回版本列表', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1 });
      versionRepo.find.mockResolvedValue([{ id: 10, version: 2 }]);
      const res = await service.getVersions(1);
      expect(versionRepo.find).toHaveBeenCalledWith({
        where: { attachmentId: 1 },
        order: { version: 'DESC' },
      });
      expect(res).toHaveLength(1);
    });

    it('附件不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.getVersions(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getAccessLogs', () => {
    function stubAccessQb(rows: unknown[], total: number) {
      const qb = mockQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
      });
      accessLogRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      return qb;
    }

    it('附件存在 → 分页查询', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1 });
      const qb = stubAccessQb([{ id: 1 }], 1);
      const res = await service.getAccessLogs(1, 2, 10);
      expect(qb.where).toHaveBeenCalledWith('l.attachment_id = :attachmentId', {
        attachmentId: 1,
      });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(res).toMatchObject({ page: 2, pageSize: 10, total: 1 });
    });

    it('无分页参数 → 默认 page=1/pageSize=20', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1 });
      stubAccessQb([], 0);
      const res = await service.getAccessLogs(1);
      expect(res).toMatchObject({ page: 1, pageSize: 20 });
    });

    it('附件不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.getAccessLogs(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
