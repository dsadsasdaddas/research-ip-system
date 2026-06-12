import {
  TransformsController,
  TransformDistributionsController,
} from './transforms.controller';
import type { TransformsService } from './transforms.service';
import type { TransformDistributionsService } from './transform-distributions.service';
import type { Response } from 'express';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
    exportResource: jest.fn().mockResolvedValue([{ a: 1 }]),
  };
}

function mockDistService(): MockObject {
  return {
    findByTransform: jest.fn().mockResolvedValue([{ id: 1 }]),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
  };
}

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as Response;
}

describe('TransformsController', () => {
  let controller: TransformsController;
  let service: MockObject;
  let distSvc: MockObject;

  beforeEach(() => {
    service = mockService();
    distSvc = mockDistService();
    controller = new TransformsController(
      service as unknown as TransformsService,
      distSvc as unknown as TransformDistributionsService,
    );
  });

  it('create 委托 service', async () => {
    await controller.create({ partner: 't' }, { id: 1 } as never);
    expect(service.create).toHaveBeenCalled();
  });

  it('findAll 解析 page/pageSize 字符串', async () => {
    await controller.findAll('kw', '2', '50', { id: 1 } as never);
    expect(service.findAll).toHaveBeenCalledWith(
      { keyword: 'kw', page: 2, pageSize: 50 },
      { id: 1 },
    );
  });

  it('findAll 无 page/pageSize 时传 undefined', async () => {
    await controller.findAll(undefined, undefined, undefined, {
      id: 1,
    } as never);
    expect(service.findAll).toHaveBeenCalledWith(
      { keyword: undefined, page: undefined, pageSize: undefined },
      { id: 1 },
    );
  });

  it('findOne / update / remove 委托 service', async () => {
    await controller.findOne(1, { id: 1 } as never);
    await controller.update(1, { partner: 'n' }, { id: 1 } as never);
    await controller.remove(1, { id: 1 } as never);
    expect(service.findOne).toHaveBeenCalledWith(1, { id: 1 });
    expect(service.update).toHaveBeenCalledWith(1, { partner: 'n' }, { id: 1 });
    expect(service.remove).toHaveBeenCalledWith(1, { id: 1 });
  });

  it('exportResource: csv 直接回传文件流(200)', async () => {
    const res = mockRes();
    await controller.exportResource(
      { format: 'csv', columns: [{ key: 'a', header: 'A' }] },
      { id: 1 } as never,
      res,
    );
    expect(service.exportResource).toHaveBeenCalledWith(
      { keyword: undefined },
      { id: 1 },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('exportResource: 带 keyword + 默认 xlsx', async () => {
    const res = mockRes();
    await controller.exportResource({ keyword: 'kw' }, { id: 1 } as never, res);
    expect(service.exportResource).toHaveBeenCalledWith(
      { keyword: 'kw' },
      { id: 1 },
    );
    expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('listDistributions 委托 distSvc', async () => {
    await controller.listDistributions(7);
    expect(distSvc.findByTransform).toHaveBeenCalledWith(7);
  });

  it('createDistribution 委托 distSvc', async () => {
    await controller.createDistribution(7, { innerRatio: 10 });
    expect(distSvc.create).toHaveBeenCalledWith(7, { innerRatio: 10 });
  });
});

describe('TransformDistributionsController', () => {
  let controller: TransformDistributionsController;
  let distSvc: MockObject;

  beforeEach(() => {
    distSvc = mockDistService();
    controller = new TransformDistributionsController(
      distSvc as unknown as TransformDistributionsService,
    );
  });

  it('update 委托 distSvc', async () => {
    await controller.update(3, { innerRatio: 20 });
    expect(distSvc.update).toHaveBeenCalledWith(3, { innerRatio: 20 });
  });

  it('remove 委托 distSvc', async () => {
    await controller.remove(3);
    expect(distSvc.remove).toHaveBeenCalledWith(3);
  });
});
