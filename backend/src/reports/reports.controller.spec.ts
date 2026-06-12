import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import type { ReadStream } from 'fs';
import { ReportsController } from './reports.controller';
import type { ReportsService } from './reports.service';
import type { ReportExportLog } from './entities/report-export-log.entity';
import type { Response } from 'express';
import type { MockObject } from '../testing/mocks';

// 控制器 downloadExport 直接用 fs.existsSync / fs.createReadStream。fs 的 ESM 绑定不可被
// spyOn 重定义,故整体 mock(以 requireActual 为基底,保留其它导出)。
jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    existsSync: jest.fn(),
    createReadStream: jest.fn(),
  };
});

// 控制器 downloadExport 直接用 fs.existsSync / fs.createReadStream,这里 mock fs。
function mockService(): MockObject {
  return {
    createTemplate: jest.fn().mockResolvedValue({ id: 1 }),
    updateTemplate: jest.fn().mockResolvedValue({ id: 1 }),
    findAllTemplates: jest.fn().mockResolvedValue([{ id: 1 }]),
    removeTemplate: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
    exportReport: jest.fn().mockResolvedValue({ id: 1, status: 'success' }),
    findAllExportLogs: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
    findOneExportLog: jest
      .fn()
      .mockResolvedValue({ id: 1, filePath: '/x/a.xlsx', status: 'success' }),
    createScheduledTask: jest.fn().mockResolvedValue({ id: 1 }),
    updateScheduledTask: jest.fn().mockResolvedValue({ id: 1 }),
    findAllScheduledTasks: jest.fn().mockResolvedValue([{ id: 1 }]),
    removeScheduledTask: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
  };
}

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    headersSent: false,
  } as unknown as Response;
}

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: MockObject;

  beforeEach(() => {
    jest.clearAllMocks();
    service = mockService();
    controller = new ReportsController(service as unknown as ReportsService);
  });

  // ──── 模板 ────

  it('findAllTemplates 委托', async () => {
    await controller.findAllTemplates('paper');
    expect(service.findAllTemplates).toHaveBeenCalledWith('paper');
  });

  it('createTemplate 委托', async () => {
    await controller.createTemplate({ code: 'c' } as never);
    expect(service.createTemplate).toHaveBeenCalledWith({ code: 'c' });
  });

  it('updateTemplate 委托', async () => {
    await controller.updateTemplate(1, { name: 'n' });
    expect(service.updateTemplate).toHaveBeenCalledWith(1, { name: 'n' });
  });

  it('removeTemplate 委托', async () => {
    await controller.removeTemplate(1);
    expect(service.removeTemplate).toHaveBeenCalledWith(1);
  });

  // ──── 导出 ────

  it('exportReport 带 format 委托', async () => {
    await controller.exportReport({ templateId: 1, format: 'csv' }, {
      id: 7,
    } as never);
    expect(service.exportReport).toHaveBeenCalledWith(1, 'csv', { id: 7 });
  });

  it('exportReport 无 format → 默认 xlsx', async () => {
    await controller.exportReport({ templateId: 2, format: undefined }, {
      id: 7,
    } as never);
    expect(service.exportReport).toHaveBeenCalledWith(2, 'xlsx', { id: 7 });
  });

  it('findAllExportLogs 解析 page/pageSize 字符串', async () => {
    await controller.findAllExportLogs('2', '50');
    expect(service.findAllExportLogs).toHaveBeenCalledWith(2, 50);
  });

  it('findAllExportLogs 无参 → undefined', async () => {
    await controller.findAllExportLogs(undefined, undefined);
    expect(service.findAllExportLogs).toHaveBeenCalledWith(
      undefined,
      undefined,
    );
  });

  // ──── downloadExport ────

  describe('downloadExport', () => {
    function makeLog(over: Partial<ReportExportLog> = {}): ReportExportLog {
      return {
        id: 1,
        filePath: '/exports/a.xlsx',
        status: 'success',
        ...over,
      } as ReportExportLog;
    }

    it('日志不存在 → 抛 404(透传 service 异常)', async () => {
      service.findOneExportLog.mockRejectedValue(new NotFoundException('no'));
      await expect(
        controller.downloadExport(1, mockRes()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('无 filePath → 404 未成功', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: null, status: 'pending' }),
      );
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: '导出文件不存在或导出未成功',
      });
    });

    it('status 非 success → 404 未成功', async () => {
      service.findOneExportLog.mockResolvedValue(makeLog({ status: 'failed' }));
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('文件已被清理(existsSync=false)→ 404', async () => {
      service.findOneExportLog.mockResolvedValue(makeLog());
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(false);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: '导出文件已被清理' });
    });

    it('xlsx 文件存在 → 设正确 MIME + pipe', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/报表.xlsx' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        // 中文文件名被 encodeURIComponent 编码,故只断言后缀
        expect.stringContaining('.xlsx'),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(stream.pipe).toHaveBeenCalledWith(res);
    });

    it('csv 文件 → text/csv; charset=utf-8', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: 'C:\\a\\b.csv' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
    });

    it('pdf 文件 → application/pdf', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/a.pdf' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
    });

    it('未知扩展名 → octet-stream', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/a.unknown' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('无扩展名 → octet-stream,filename 回退 export', async () => {
      // filePath 以分隔符结尾 → pop() 返回空串 → fileName 走 || 'export' 回退
      service.findOneExportLog.mockResolvedValue(makeLog({ filePath: 'a/b/' }));
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('export'),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('文件名为单个点 → split 后 pop 为空 → ext 走 || "" 回退(octet-stream)', async () => {
      service.findOneExportLog.mockResolvedValue(makeLog({ filePath: '.' }));
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('文件扩展名大写 → 走 toLowerCase 匹配', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/A.PDF' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      const stream = {
        pipe: jest.fn(),
        on: jest.fn(),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
    });

    it('stream error 且未发送头 → 500', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/a.xlsx' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      let onError: ((e: unknown) => void) | undefined;
      const stream = {
        pipe: jest.fn(),
        on: jest.fn((event: string, cb: (e: unknown) => void) => {
          if (event === 'error') onError = cb;
        }),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      await controller.downloadExport(1, res);
      // 触发 stream error 回调
      onError?.(new Error('read fail'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: '文件读取失败' });
    });

    it('stream error 但头已发送 → 不再 500', async () => {
      service.findOneExportLog.mockResolvedValue(
        makeLog({ filePath: '/x/a.xlsx' }),
      );
      (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
      let onError: ((e: unknown) => void) | undefined;
      const stream = {
        pipe: jest.fn(),
        on: jest.fn((event: string, cb: (e: unknown) => void) => {
          if (event === 'error') onError = cb;
        }),
      } as unknown as ReadStream;
      (fs.createReadStream as unknown as jest.Mock).mockReturnValue(stream);
      const res = mockRes();
      (res as unknown as { headersSent: boolean }).headersSent = true;
      await controller.downloadExport(1, res);
      onError?.(new Error('read fail'));
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  // ──── 定时任务 ────

  it('findAllScheduledTasks 委托', async () => {
    await controller.findAllScheduledTasks();
    expect(service.findAllScheduledTasks).toHaveBeenCalled();
  });

  it('createScheduledTask 委托', async () => {
    await controller.createScheduledTask({ templateId: 1 } as never);
    expect(service.createScheduledTask).toHaveBeenCalledWith({ templateId: 1 });
  });

  it('updateScheduledTask 委托', async () => {
    await controller.updateScheduledTask(1, { taskName: 'n' });
    expect(service.updateScheduledTask).toHaveBeenCalledWith(1, {
      taskName: 'n',
    });
  });

  it('removeScheduledTask 委托', async () => {
    await controller.removeScheduledTask(1);
    expect(service.removeScheduledTask).toHaveBeenCalledWith(1);
  });
});
