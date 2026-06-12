import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import * as fs from 'fs';
import { Writable } from 'stream';
import { ReportsService } from './reports.service';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportExportLog } from './entities/report-export-log.entity';
import { ScheduledReportTask } from './entities/scheduled-report-task.entity';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';

// pdfkit 的 default export 被服务以 `import PDFDocument from 'pdfkit'` 引入(esModuleInterop)。
// 这里把模块 mock 成 { __esModule: true, default: 构造函数 }。构造函数返回的 doc 提供
// 链式绘制方法;服务调用 doc.pipe(stream) 把下游流接上,doc.end() 时触发该流的 'finish' 事件,
// 从而 resolve generatePdf 的 Promise。
type FakeStreamLike = {
  emitFinish: () => void;
  emitError: (e: unknown) => void;
};
// pdfkit mock 文档对象:链式方法 + page 几何信息(服务读 doc.page.width / margins / doc.y)
function makeMockDoc(): Record<string, unknown> {
  let target: FakeStreamLike | null = null;
  return {
    pipe: jest.fn((s: FakeStreamLike) => {
      target = s;
    }),
    registerFont: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(() => {
      target?.emitFinish();
    }),
    page: {
      width: 842,
      height: 595,
      margins: { left: 36, right: 36, top: 36, bottom: 36 },
    },
    y: 36,
  };
}
jest.mock('pdfkit', () => {
  const ctor = jest.fn().mockImplementation(() => makeMockDoc());
  return { __esModule: true, default: ctor };
});

// fontkit 服务以 import * as fontkit 引入,在 resolveCjkFont 里调用 fontkit.openSync
jest.mock('fontkit', () => ({
  openSync: jest.fn(),
}));

// 整个 fs 模块 mock:用 jest.requireActual 取真实 fs 为基底,仅覆盖服务直接调用的几个方法,
// 这样 fs.constants 等 exceljs/tmp 加载所需的导出仍然存在,exceljs 不会在 import 时炸。
// createWriteStream 返回一个真实的、内存版的 Writable stream(exceljs 的 writeFile 会
// 调它的 .write()/.end();pdf 的 generatePdf 会监听 'finish' 事件以 resolve Promise),
// 故必须是一个行为完整的 Node Writable,而不是简单 jest.fn。
interface MemStream extends Writable {
  // 便于测试需要时主动触发(正常 end() 已会触发 finish)
  emitFinish(): void;
  emitError(e: unknown): void;
}
function makeMemStream(): MemStream {
  const chunks: Buffer[] = [];
  const w = new Writable({
    write(chunk: Buffer, _enc: string, cb: () => void) {
      chunks.push(chunk);
      cb();
    },
  }) as MemStream;
  w.emitFinish = () => w.emit('finish');
  w.emitError = (e: unknown) => w.emit('error', e);
  return w;
}
let fakeStream: MemStream;

// fs mock:用 jest.requireActual 取真实 fs 为基底,仅覆盖服务直接调用的几个方法,
// 这样 fs.constants 等 exceljs/tmp 加载所需的导出仍然存在,exceljs 不会在 import 时炸。
// requireActual 必须在工厂内部调用(工厂被 hoist 到文件顶部执行)。
jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    createWriteStream: jest.fn(),
    promises: { ...(real.promises as object), writeFile: jest.fn() },
  };
});

describe('ReportsService', () => {
  let service: ReportsService;
  let templateRepo: ReturnType<typeof mockRepository>;
  let exportLogRepo: ReturnType<typeof mockRepository>;
  let scheduledTaskRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    templateRepo = mockRepository();
    exportLogRepo = mockRepository();
    scheduledTaskRepo = mockRepository();

    // templateRepo.manager.query 在 exportReport 里被调用,需补上
    (templateRepo as Record<string, unknown>).manager = {
      query: jest.fn().mockResolvedValue([]),
    };

    // 默认:exports 目录存在,写盘成功。fs 已被 jest.mock 成 jest.fn,
    // clearAllMocks 会清掉返回值,故每次 beforeEach 重新设默认。
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as unknown as jest.Mock).mockReturnValue(undefined);
    (fs.readFileSync as unknown as jest.Mock).mockReturnValue(
      Buffer.from('font'),
    );
    (fs.promises.writeFile as unknown as jest.Mock).mockResolvedValue(
      undefined,
    );

    // createWriteStream 返回一个可控的内存 Writable(pdf 生成用)
    fakeStream = makeMemStream();
    (fs.createWriteStream as unknown as jest.Mock).mockImplementation(
      () => fakeStream,
    );

    service = new ReportsService(
      templateRepo as unknown as Repository<ReportTemplate>,
      exportLogRepo as unknown as Repository<ReportExportLog>,
      scheduledTaskRepo as unknown as Repository<ScheduledReportTask>,
    );
  });

  /** 取当前 promises.writeFile 的 mock,便于断言/改返回值 */
  function writeFileMock(): jest.Mock {
    return fs.promises.writeFile as unknown as jest.Mock;
  }
  /** 取当前 existsSync 的 mock */
  function existsSyncMock(): jest.Mock {
    return fs.existsSync as unknown as jest.Mock;
  }
  /** 取当前 mkdirSync 的 mock */
  function mkdirSyncMock(): jest.Mock {
    return fs.mkdirSync as unknown as jest.Mock;
  }

  // ──── 模板 CRUD ────

  describe('createTemplate', () => {
    it('注入并保存', async () => {
      templateRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createTemplate({
        code: 'c1',
        name: 'n',
        reportType: 'paper',
      });
      expect(out).toMatchObject({ code: 'c1' });
      expect(templateRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateTemplate', () => {
    it('存在 → 合并并保存', async () => {
      templateRepo.findOneBy.mockResolvedValue({
        id: 1,
        name: 'old',
        reportType: 'paper',
      });
      const out = await service.updateTemplate(1, { name: 'new' });
      expect((out as Record<string, unknown>).name).toBe('new');
      expect(templateRepo.save).toHaveBeenCalled();
    });

    it('不存在 → 404', async () => {
      templateRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.updateTemplate(1, { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAllTemplates', () => {
    it('带 reportType → where 含 reportType', async () => {
      templateRepo.find.mockResolvedValue([{ id: 1 }]);
      const out = await service.findAllTemplates('paper');
      expect(templateRepo.find).toHaveBeenCalledWith({
        where: { reportType: 'paper' },
        order: { id: 'ASC' },
      });
      expect(out).toHaveLength(1);
    });

    it('无 reportType → 空 where', async () => {
      templateRepo.find.mockResolvedValue([]);
      await service.findAllTemplates();
      expect(templateRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { id: 'ASC' },
      });
    });
  });

  describe('findOneTemplate', () => {
    it('存在 → 返回', async () => {
      const t = { id: 1 };
      templateRepo.findOneBy.mockResolvedValue(t);
      await expect(service.findOneTemplate(1)).resolves.toBe(t);
    });
    it('不存在 → 404', async () => {
      templateRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOneTemplate(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('removeTemplate', () => {
    it('存在 → 删除', async () => {
      templateRepo.findOneBy.mockResolvedValue({ id: 1 });
      await expect(service.removeTemplate(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(templateRepo.delete).toHaveBeenCalledWith(1);
    });
    it('不存在 → 404', async () => {
      templateRepo.findOneBy.mockResolvedValue(null);
      await expect(service.removeTemplate(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ──── 导出 ────

  describe('exportReport', () => {
    function makeTemplate(over: Partial<ReportTemplate> = {}): ReportTemplate {
      return {
        id: 1,
        code: 'TPL',
        name: '模板',
        reportType: 'paper',
        configJson:
          '{"columns":[{"header":"标题","key":"title"},{"header":"日期","key":"date"}]}',
        scope: 'all',
        isActive: true,
        createUser: 'u',
        createTime: new Date(),
        updateTime: new Date(),
        ...over,
      };
    }

    it('xlsx 成功:写日志、更新为 success', async () => {
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([{ title: 'a' }]),
      };
      const user = mockAuthUser();

      const out = await service.exportReport(1, 'xlsx', user);

      expect(out.status).toBe('success');
      expect(out.filePath).toBeTruthy();
      expect(exportLogRepo.save).toHaveBeenCalledTimes(2);
    });

    it('format 为空 → 默认 xlsx', async () => {
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, '', mockAuthUser());
      expect(out.status).toBe('success');
      expect(out.exportFormat).toBe('xlsx');
    });

    it('exports 目录不存在 → mkdirSync', async () => {
      existsSyncMock().mockReturnValue(false);
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      await service.exportReport(1, 'xlsx', mockAuthUser());
      expect(mkdirSyncMock()).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it('未知 reportType → tableName 为 null,不查询数据库,数据为空', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ reportType: 'custom' }),
      );
      const out = await service.exportReport(1, 'xlsx', mockAuthUser());
      expect(
        (templateRepo as Record<string, { query: jest.Mock }>).manager.query,
      ).not.toHaveBeenCalled();
      expect(out.status).toBe('success');
    });

    it('configJson 为空 → columns 为 []', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      const out = await service.exportReport(1, 'xlsx', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('csv 成功路径 + escapeCell 全分支(null/Date/object/特殊字符)', async () => {
      // 覆盖 escapeCell 的 null/Date/object/含逗号引号换行 字段 → 引号转义分支
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([
          { title: null, date: new Date('2024-01-01T00:00:00Z') },
          { title: 'a,b"c\nd', date: { x: 1 } },
        ]),
      };
      const out = await service.exportReport(1, 'csv', mockAuthUser());
      expect(out.status).toBe('success');
      const written = writeFileMock().mock.calls[0][1] as string;
      expect(written.charCodeAt(0)).toBe(0xfeff); // BOM
      expect(written).toContain('\r\n');
      expect(written).toContain('"a,b""c\nd"'); // 引号转义 + 字段包裹
      expect(written).toContain('2024'); // Date → toLocaleString 含年份
    });

    it('csv 无 columns 无数据 → cols 为空,仅 BOM', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([]),
      };
      const out = await service.exportReport(1, 'csv', mockAuthUser());
      expect(out.status).toBe('success');
      const written = writeFileMock().mock.calls[0][1] as string;
      // 无列无行 → lines 为空 → 仅 BOM,无尾随换行
      expect(written).toBe('﻿');
    });

    it('csv 无 columns 有数据 → cols 取首行 key', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([{ a: 1, b: 2 }]),
      };
      const out = await service.exportReport(1, 'csv', mockAuthUser());
      expect(out.status).toBe('success');
      const written = writeFileMock().mock.calls[0][1] as string;
      expect(written).toContain('a,b'); // 表头取首行 key
    });

    it('xlsx/csv/pdf 列 header 为空 → 回退用 key(覆盖 col.header||col.key)', async () => {
      // configJson 列显式配置但 header 为空串 → 三种格式均走 col.header||col.key 的 fallback
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({
          configJson: JSON.stringify({
            columns: [
              { header: '', key: 'title' },
              { header: '', key: 'date' },
            ],
          }),
        }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([{ title: 't', date: 'd' }]),
      };
      // xlsx
      expect(
        (await service.exportReport(1, 'xlsx', mockAuthUser())).status,
      ).toBe('success');
      // csv:表头应回退为 key
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({
          configJson: JSON.stringify({
            columns: [{ header: '', key: 'title' }],
          }),
        }),
      );
      const csvOut = await service.exportReport(1, 'csv', mockAuthUser());
      expect(csvOut.status).toBe('success');
      expect(writeFileMock().mock.calls[0][1]).toContain('title'); // header 空时回退用 key
      // pdf:header 空时走 truncate('') → '' 早返回分支
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({
          configJson: JSON.stringify({
            columns: [{ header: '', key: 'title' }],
          }),
        }),
      );
      expect(
        (await service.exportReport(1, 'pdf', mockAuthUser())).status,
      ).toBe('success');
    });

    it('pdf 成功路径(无 CJK 字体 → 回退 Helvetica + 提示)', async () => {
      // 字体候选全部不存在 → resolveCjkFont 返回 null
      existsSyncMock().mockReturnValue(false);
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('pdf 无数据(cols=0)→ 走"（无数据）"分支', async () => {
      existsSyncMock().mockReturnValue(false);
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([]),
      };
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('pdf 有数据行(含分页 addPage + 隔行底纹 + Date/null 单元格)', async () => {
      existsSyncMock().mockReturnValue(false);
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      // 30 行 → 超过单页高度触发 addPage;含奇数行(隔行底纹)、Date、null 单元格、长文本(触发 truncate slice)
      const rows: Array<Record<string, unknown>> = [];
      for (let i = 0; i < 30; i++) {
        rows.push({
          title: i === 0 ? 'x'.repeat(200) : `行${i}`, // 第一行长文本触发 truncate 截断分支
          date: i === 1 ? new Date('2024-01-01T00:00:00Z') : null,
        });
      }
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue(rows),
      };
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('pdf 无 columns 有数据 → cols 取首行 key', async () => {
      existsSyncMock().mockReturnValue(false);
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([{ a: 1, b: 2 }]),
      };
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('pdf 成功路径(TTF 字体,psName 为 null)', async () => {
      // REPORT_CJK_FONT 候选存在 → openSync 返回无 fonts 的对象 → psName=null
      process.env.REPORT_CJK_FONT = '/tmp/font.ttf';
      existsSyncMock().mockReturnValue(true);
      const fontkit = jest.requireMock('fontkit');
      fontkit.openSync.mockReturnValue({}); // 单 TTF,无 fonts 数组
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
      delete process.env.REPORT_CJK_FONT;
    });

    it('pdf 成功路径(TTC 字体,psName 非空)', async () => {
      process.env.REPORT_CJK_FONT = '/tmp/font.ttc';
      existsSyncMock().mockReturnValue(true);
      const fontkit = jest.requireMock('fontkit');
      fontkit.openSync.mockReturnValue({
        fonts: [{ postscriptName: 'CJK-PS' }],
      });
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
      delete process.env.REPORT_CJK_FONT;
    });

    it('pdf:registerFont 抛错 → 保持 Helvetica 不报错', async () => {
      process.env.REPORT_CJK_FONT = '/tmp/font.ttf';
      existsSyncMock().mockReturnValue(true);
      const fontkit = jest.requireMock('fontkit');
      fontkit.openSync.mockReturnValue({ fonts: [{ postscriptName: 'PS' }] });
      const pdfkitMod = jest.requireMock('pdfkit');
      // 让本次 PDFDocument 实例的 registerFont 抛错,但 end() 仍触发 finish
      let target: FakeStreamLike | null = null;
      pdfkitMod.default.mockImplementationOnce(() => {
        const doc: Record<string, unknown> = {
          pipe: jest.fn((s: FakeStreamLike) => {
            target = s;
          }),
          registerFont: jest.fn(() => {
            throw new Error('register failed');
          }),
          fontSize: jest.fn().mockReturnThis(),
          font: jest.fn().mockReturnThis(),
          fillColor: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnThis(),
          moveDown: jest.fn().mockReturnThis(),
          rect: jest.fn().mockReturnThis(),
          fill: jest.fn().mockReturnThis(),
          addPage: jest.fn().mockReturnThis(),
          end: jest.fn(() => {
            target?.emitFinish();
          }),
          page: {
            width: 842,
            height: 595,
            margins: { left: 36, right: 36, top: 36, bottom: 36 },
          },
          y: 36,
        };
        return doc;
      });
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, 'pdf', mockAuthUser());
      expect(out.status).toBe('success');
      delete process.env.REPORT_CJK_FONT;
    });

    it('xlsx 无 columns 有数据 → 用首行 key 作表头', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([{ a: 1, b: 2 }]),
      };
      const out = await service.exportReport(1, 'xlsx', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('xlsx 无 columns 无数据 → 跳过 addRow', async () => {
      templateRepo.findOneBy.mockResolvedValue(
        makeTemplate({ configJson: null }),
      );
      (templateRepo as Record<string, unknown>).manager = {
        query: jest.fn().mockResolvedValue([]),
      };
      const out = await service.exportReport(1, 'xlsx', mockAuthUser());
      expect(out.status).toBe('success');
    });

    it('未知格式 → 回退 xlsx', async () => {
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      const out = await service.exportReport(1, 'docx', mockAuthUser());
      expect(out.exportFormat).toBe('docx');
      expect(out.status).toBe('success');
    });

    it('生成阶段抛错 → 日志更新为 failed(err 为 Error)', async () => {
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      writeFileMock().mockRejectedValue(new Error('disk full'));
      const out = await service.exportReport(1, 'csv', mockAuthUser());
      expect(out.status).toBe('failed');
      expect(out.errorMessage).toBe('disk full');
    });

    it('生成阶段抛非 Error → errorMessage 走 String(err)', async () => {
      templateRepo.findOneBy.mockResolvedValue(makeTemplate());
      writeFileMock().mockRejectedValue('boom');
      const out = await service.exportReport(1, 'csv', mockAuthUser());
      expect(out.status).toBe('failed');
      expect(out.errorMessage).toBe('boom');
    });

    it('模板不存在 → 404(不写日志)', async () => {
      templateRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.exportReport(1, 'xlsx', mockAuthUser()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ──── 导出日志 ────

  describe('findAllExportLogs', () => {
    function withQb(terminal: Record<string, jest.Mock>) {
      const qb = mockQueryBuilder(terminal);
      exportLogRepo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      (exportLogRepo as Record<string, unknown>).manager = { query: jest.fn() };
      service = new ReportsService(
        templateRepo as unknown as Repository<ReportTemplate>,
        exportLogRepo as unknown as Repository<ReportExportLog>,
        scheduledTaskRepo as unknown as Repository<ScheduledReportTask>,
      );
      return qb;
    }

    it('分页查询', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findAllExportLogs(2, 50);
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
      expect(qb.orderBy).toHaveBeenCalledWith('l.create_time', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(50);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('无分页参数 → 默认 page=1 pageSize=20', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      const res = await service.findAllExportLogs();
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
      expect(qb.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOneExportLog', () => {
    it('存在 → 返回', async () => {
      const log = { id: 1 };
      exportLogRepo.findOneBy.mockResolvedValue(log);
      await expect(service.findOneExportLog(1)).resolves.toBe(log);
    });
    it('不存在 → 404', async () => {
      exportLogRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOneExportLog(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ──── 定时任务 CRUD ────

  describe('createScheduledTask', () => {
    it('注入并保存', async () => {
      scheduledTaskRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createScheduledTask({
        templateId: 1,
        taskName: 't',
        cronExpr: '* * * * *',
      });
      expect(out).toMatchObject({ taskName: 't' });
    });
  });

  describe('updateScheduledTask', () => {
    it('存在 → 合并并保存', async () => {
      scheduledTaskRepo.findOneBy.mockResolvedValue({ id: 1, taskName: 'old' });
      const out = await service.updateScheduledTask(1, {
        taskName: 'new',
      });
      expect((out as Record<string, unknown>).taskName).toBe('new');
    });
    it('不存在 → 404', async () => {
      scheduledTaskRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateScheduledTask(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAllScheduledTasks', () => {
    it('按 id 升序返回', async () => {
      scheduledTaskRepo.find.mockResolvedValue([{ id: 1 }]);
      const out = await service.findAllScheduledTasks();
      expect(scheduledTaskRepo.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
      expect(out).toHaveLength(1);
    });
  });

  describe('removeScheduledTask', () => {
    it('存在 → 删除', async () => {
      scheduledTaskRepo.findOneBy.mockResolvedValue({ id: 1 });
      await expect(service.removeScheduledTask(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(scheduledTaskRepo.delete).toHaveBeenCalledWith(1);
    });
    it('不存在 → 404', async () => {
      scheduledTaskRepo.findOneBy.mockResolvedValue(null);
      await expect(service.removeScheduledTask(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
