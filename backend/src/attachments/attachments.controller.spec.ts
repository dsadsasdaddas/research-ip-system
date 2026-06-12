import { AttachmentsController } from './attachments.controller';
import type { AttachmentsService } from './attachments.service';
import type { Response } from 'express';
import type { MockObject } from '../testing/mocks';
import * as fs from 'fs';

jest.mock('fs');
const fsMock = fs as jest.Mocked<typeof fs>;

// 捕获 multer diskStorage 的配置(destination/filename 回调),便于直接驱动 filename 回调覆盖其分支。
// 用 var 规避 jest.mock 工厂提前执行时的 TDZ(jest.mock 提升到文件顶部)。
type CapturedStorageConfig = {
  destination: unknown;
  filename: (
    req: unknown,
    file: Express.Multer.File,
    cb: (err: unknown, name: string) => void,
  ) => void;
};
// eslint-disable-next-line no-var
var capturedStorageConfig: CapturedStorageConfig | undefined;
jest.mock('multer', () => {
  const cap: { current?: CapturedStorageConfig } = {};
  return {
    diskStorage: jest.fn((cfg: CapturedStorageConfig) => {
      cap.current = cfg;
      capturedStorageConfig = cfg;
      return { _cfg: cfg, _cap: cap };
    }),
    default: jest.fn(),
  };
});

/** 一个最小可用的 stream mock:记录 error 监听器,pipe 调用 res。 */
function mockStream() {
  const handlers: Record<string, ((...args: unknown[]) => void) | undefined> =
    {};
  const stream = {
    on: jest
      .fn()
      .mockImplementation((event: string, cb: (...a: unknown[]) => void) => {
        handlers[event] = cb;
        return stream;
      }),
    pipe: jest.fn().mockImplementation((dest: unknown) => dest),
    emit: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
  };
  return stream;
}

function mockService(): MockObject {
  return {
    saveFile: jest.fn().mockResolvedValue({ id: 1 }),
    list: jest.fn().mockResolvedValue([{ id: 1 }]),
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      filePath: '/uploads/a.pdf',
      originalName: 'a.pdf',
      mimeType: 'application/pdf',
    }),
    checkAccess: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue({ success: true }),
    getVersions: jest.fn().mockResolvedValue([{ id: 1 }]),
    getAccessLogs: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  };
}

function mockRes(): Response {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headersSent: false,
  } as unknown as Response;
}

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new AttachmentsController(
      service as unknown as AttachmentsService,
    );
    fsMock.createReadStream.mockReset();
  });

  it('upload 委托 service(+relationId 转 number)', async () => {
    await controller.upload(
      { filename: 'f.pdf' } as never,
      'paper',
      '7',
      '备注',
      { id: 1 } as never,
    );
    expect(service.saveFile).toHaveBeenCalledWith(
      { filename: 'f.pdf' },
      'paper',
      7,
      { id: 1 },
      '备注',
    );
  });

  it('list 委托 service(relationId 转 number)', async () => {
    await controller.list('paper', '7', { id: 1 } as never);
    expect(service.list).toHaveBeenCalledWith('paper', 7, { id: 1 });
  });

  describe('download', () => {
    it('正常: 设置头 + pipe 流', async () => {
      const stream = mockStream();
      fsMock.createReadStream.mockReturnValue(stream as never);
      const res = mockRes();
      await controller.download(1, res, { id: 1 } as never);
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.checkAccess).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="a.pdf"',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(stream.pipe).toHaveBeenCalledWith(res);
    });

    it('mimeType 为空 → 默认 application/octet-stream', async () => {
      service.findOne.mockResolvedValue({
        id: 1,
        filePath: '/x',
        originalName: 'a',
        mimeType: null,
      });
      const stream = mockStream();
      fsMock.createReadStream.mockReturnValue(stream as never);
      const res = mockRes();
      await controller.download(1, res, { id: 1 } as never);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('文件名含中文/特殊字符 → encodeURIComponent', async () => {
      service.findOne.mockResolvedValue({
        id: 1,
        filePath: '/x',
        originalName: '报告(1).pdf',
        mimeType: 'application/pdf',
      });
      const stream = mockStream();
      fsMock.createReadStream.mockReturnValue(stream as never);
      const res = mockRes();
      await controller.download(1, res, { id: 1 } as never);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent('报告(1).pdf')}"`,
      );
    });

    it('checkAccess 抛错 → 不下载(透传异常)', async () => {
      service.checkAccess.mockRejectedValue(new Error('forbidden'));
      const res = mockRes();
      await expect(
        controller.download(1, res, { id: 1 } as never),
      ).rejects.toThrow('forbidden');
      expect(fsMock.createReadStream).not.toHaveBeenCalled();
    });

    it('stream error 且 headers 未发送 → 返回 500', async () => {
      const stream = mockStream();
      fsMock.createReadStream.mockReturnValue(stream as never);
      const res = mockRes();
      await controller.download(1, res, { id: 1 } as never);
      // 触发 error 事件
      stream.emit('error', new Error('read fail'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: '文件读取失败' });
    });

    it('stream error 但 headers 已发送 → 不再写响应', async () => {
      const stream = mockStream();
      fsMock.createReadStream.mockReturnValue(stream as never);
      const res = mockRes();
      (res as unknown as { headersSent: boolean }).headersSent = true;
      await controller.download(1, res, { id: 1 } as never);
      stream.emit('error', new Error('read fail'));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  it('getVersions 委托 service(转 number)', async () => {
    await controller.getVersions('3');
    expect(service.getVersions).toHaveBeenCalledWith(3);
  });

  describe('getAccessLogs', () => {
    it('带分页参数 → 转 number', async () => {
      await controller.getAccessLogs('3', '2', '10');
      expect(service.getAccessLogs).toHaveBeenCalledWith(3, 2, 10);
    });

    it('无分页参数 → 传 undefined', async () => {
      await controller.getAccessLogs('3');
      expect(service.getAccessLogs).toHaveBeenCalledWith(
        3,
        undefined,
        undefined,
      );
    });
  });

  describe('remove', () => {
    it('有权 → 委托 service.remove', async () => {
      const res = await controller.remove(1, { id: 1 } as never);
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.checkAccess).toHaveBeenCalled();
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(res).toEqual({ success: true });
    });

    it('checkAccess 抛错 → 透传,不调用 remove', async () => {
      service.checkAccess.mockRejectedValue(new Error('no'));
      await expect(controller.remove(1, { id: 1 } as never)).rejects.toThrow(
        'no',
      );
      expect(service.remove).not.toHaveBeenCalled();
    });
  });

  describe('multer diskStorage 配置(模块顶层 storage)', () => {
    it('filename 回调:按 originalname 扩展名生成唯一文件名', () => {
      expect(capturedStorageConfig).toBeDefined();
      const cb = jest.fn();
      capturedStorageConfig.filename(
        null,
        { originalname: '报告.pdf' } as Express.Multer.File,
        cb,
      );
      expect(cb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^\d+-\d+\.pdf$/),
      );
    });

    it('filename 回调:无扩展名 → 仅时间戳+随机', () => {
      const cb = jest.fn();
      capturedStorageConfig.filename(
        null,
        { originalname: 'README' } as Express.Multer.File,
        cb,
      );
      expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^\d+-\d+$/));
    });

    it('destination 为 uploads 绝对路径', () => {
      expect(capturedStorageConfig.destination).toEqual(
        expect.stringContaining('uploads'),
      );
    });
  });
});
