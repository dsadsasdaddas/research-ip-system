import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PapersService } from './papers.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { Paper } from './entities/paper.entity';
import { UserRole } from '../users/entities/user.entity';

const originalFetch = global.fetch;

describe('PapersService', () => {
  let service: PapersService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new PapersService(repo as unknown as Repository<Paper>);
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('create', () => {
    it('DOI 已存在 → 409', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      await expect(
        service.create({ doi: '10.1/x', title: 't' }, mockAuthUser()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { doi: '10.1/x' } });
    });

    it('DOI 不存在 → 注入 deptId/createUser 并保存', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.create(
        {
          doi: '10.1/x',
          title: 't',
          deptId: 999,
          createUser: 'hacker',
        },
        mockAuthUser(UserRole.SYS_ADMIN, 5),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.deptId).toBe(5); // 前端传入的 deptId 被忽略,改用 user.deptId
      expect(created.createUser).toBe('test');
    });

    it('无 DOI → 跳过唯一性检查直接保存', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.create(
        { title: 't' },
        mockAuthUser(UserRole.RESEARCHER, null),
      );
      expect(repo.findOne).not.toHaveBeenCalled();
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.deptId).toBeNull(); // user.deptId 为 null
    });
  });

  describe('findAll / exportResource (listQuery 分支)', () => {
    function withQb(terminal: Record<string, jest.Mock>) {
      const qb = mockQueryBuilder(terminal);
      repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new PapersService(repo as unknown as Repository<Paper>);
      return qb;
    }

    it('sys_admin + 无 keyword:不加部门/关键字条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findAll({ keyword: undefined }, mockAuthUser());
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
      // orderBy 链应被调用
      expect(qb.orderBy).toHaveBeenCalled();
    });

    it('researcher + keyword:加部门 + 密级 + 关键字条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll(
        { keyword: 'kw' },
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('exportResource 不分页,最多取 10000', async () => {
      const qb = withQb({
        getMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      });
      const rows = await service.exportResource(
        { keyword: 'x' },
        mockAuthUser(),
      );
      expect(qb.take).toHaveBeenCalledWith(10000);
      expect(rows).toHaveLength(2);
    });

    it('无 user 时 listQuery 走默认分支(部门 undefined / 密级仅公开)', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll({ keyword: undefined }, undefined);
      // 只应有一条"仅公开"密级条件 —— 无 user 时不加部门条件,无 keyword 不加关键字
      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.secretLevel IN (:...levels)',
        { levels: ['公开'] },
      );
    });
  });

  describe('findOne', () => {
    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('无 user → 直接返回', async () => {
      const paper = { id: 1, secretLevel: '公开', deptId: 5 } as Paper;
      repo.findOne.mockResolvedValue(paper);
      await expect(service.findOne(1)).resolves.toBe(paper);
    });

    it('密级不在允许范围 → 404', async () => {
      repo.findOne.mockResolvedValue({ id: 1, secretLevel: '涉密', deptId: 5 });
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('部门不匹配 → 404', async () => {
      repo.findOne.mockResolvedValue({ id: 1, secretLevel: '公开', deptId: 6 });
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sys_admin 全院可看 → 返回', async () => {
      const paper = { id: 1, secretLevel: '涉密', deptId: 99 } as Paper;
      repo.findOne.mockResolvedValue(paper);
      await expect(
        service.findOne(1, mockAuthUser(UserRole.SYS_ADMIN)),
      ).resolves.toBe(paper);
    });

    it('secretLevel 为空按公开处理 + 部门匹配 → 返回', async () => {
      const paper = { id: 1, secretLevel: null, deptId: 5 } as Paper;
      repo.findOne.mockResolvedValue(paper);
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).resolves.toBe(paper);
    });
  });

  describe('update', () => {
    it('存在 → 合并(忽略 deptId/createUser)并保存', async () => {
      const paper = {
        id: 1,
        title: 'old',
        deptId: 5,
        createUser: 'u',
        secretLevel: '公开',
      };
      repo.findOne.mockResolvedValue(paper);
      await service.update(
        1,
        { title: 'new', deptId: 999, createUser: 'hacker' },
        mockAuthUser(UserRole.SYS_ADMIN, 5),
      );
      expect(repo.save).toHaveBeenCalled();
      expect((paper as Record<string, unknown>).title).toBe('new');
      expect((paper as Record<string, unknown>).deptId).toBe(5); // 未被前端覆盖
    });

    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('存在 → 删除', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.remove(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(repo.remove).toHaveBeenCalled();
    });
    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('doiLookup', () => {
    it('doi 为空 → 400', async () => {
      await expect(service.doiLookup('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('CrossRef 返回 404 → NotFoundException', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ status: 404, ok: false }) as never;
      await expect(service.doiLookup('10.1/x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('CrossRef 返回非 404 错误 → 400', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ status: 500, ok: false }) as never;
      await expect(service.doiLookup('10.1/x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('fetch 抛网络错误 → 400(请求失败)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network')) as never;
      await expect(service.doiLookup('10.1/x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('message 缺失 → 400(数据异常)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({}),
      }) as never;
      await expect(service.doiLookup('10.1/x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('完整消息 → 正确映射(published 取年)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          message: {
            DOI: '10.1/x',
            title: ['T'],
            author: [{ given: 'A', family: 'B' }],
            'container-title': ['J'],
            ISSN: ['0000-0000'],
            volume: '1',
            issue: '2',
            page: '3-9',
            abstract: '<p>hello <b>world</b></p>',
            'is-referenced-by-count': 7,
            published: { 'date-parts': [[2020, 1, 1]] },
          },
        }),
      }) as never;
      const out = await service.doiLookup('10.1/x');
      expect(out).toMatchObject({
        doi: '10.1/x',
        title: 'T',
        firstAuthor: 'A B',
        authors: 'A B',
        journal: 'J',
        issnCn: '0000-0000',
        volumePage: 'Vol.1(2), 3-9',
        publishYear: 2020,
        citationCount: 7,
        summary: 'hello world',
      });
    });

    it('字段缺失 → 默认值 + published-print 取年', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          message: { 'published-print': { 'date-parts': [[2019]] } },
        }),
      }) as never;
      const out = await service.doiLookup('10.1/y');
      expect(out.doi).toBe('10.1/y');
      expect(out.title).toBe('');
      expect(out.firstAuthor).toBe('');
      expect(out.authors).toBe('');
      expect(out.journal).toBe('');
      expect(out.issnCn).toBe('');
      expect(out.volumePage).toBe('');
      expect(out.publishYear).toBe(2019);
      expect(out.citationCount).toBe(0);
      expect(out.summary).toBe('');
    });

    it('无任何日期字段 → publishYear 为 null', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ message: { DOI: '10.1/z' } }),
      }) as never;
      const out = await service.doiLookup('10.1/z');
      expect(out.publishYear).toBeNull();
    });
  });
});
