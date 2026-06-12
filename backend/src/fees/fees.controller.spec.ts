import {
  FeesController,
  FeePlansController,
  FeePaymentsController,
} from './fees.controller';
import type { FeesService, PatentForPlan } from './fees.service';
import type { FeePlansService } from './fee-plans.service';
import type { FeePaymentsService } from './fee-payments.service';
import type { FeeVouchersService } from './fee-vouchers.service';
import type { MockObject } from '../testing/mocks';
import { mockAuthUser } from '../testing/mocks';
import { UserRole } from '../users/entities/user.entity';

function mockFeesService(): MockObject {
  return {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ success: true }),
    alertSummary: jest.fn().mockResolvedValue({ total: 0 }),
    generatePlansFromPatents: jest.fn().mockResolvedValue({ generated: 0 }),
  };
}

function mockPlansService(): MockObject {
  return {
    findByFee: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
  };
}

function mockPaymentsService(): MockObject {
  return {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findByFee: jest.fn().mockResolvedValue([]),
    updateFinanceStatus: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

function mockVouchersService(): MockObject {
  return {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findByPaymentRecord: jest.fn().mockResolvedValue([]),
  };
}

describe('FeesController', () => {
  let controller: FeesController;
  let svc: MockObject;
  let plansSvc: MockObject;
  let paymentsSvc: MockObject;
  let vouchersSvc: MockObject;

  beforeEach(() => {
    svc = mockFeesService();
    plansSvc = mockPlansService();
    paymentsSvc = mockPaymentsService();
    vouchersSvc = mockVouchersService();
    controller = new FeesController(
      svc as unknown as FeesService,
      plansSvc as unknown as FeePlansService,
      paymentsSvc as unknown as FeePaymentsService,
      vouchersSvc as unknown as FeeVouchersService,
    );
  });

  it('create 委托 svc', async () => {
    await controller.create({ relationName: 'n' }, mockAuthUser());
    expect(svc.create).toHaveBeenCalled();
  });

  it('findAll 全院用户 → deptId=undefined', async () => {
    await controller.findAll(
      'kw',
      'patent',
      'paid',
      '1',
      mockAuthUser(UserRole.SYS_ADMIN),
    );
    expect(svc.findAll).toHaveBeenCalledWith({
      keyword: 'kw',
      relationType: 'patent',
      payStatus: 'paid',
      alertLevel: '1',
      deptId: undefined,
    });
  });

  it('findAll 部门隔离用户 → deptId=user.deptId', async () => {
    await controller.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      mockAuthUser(UserRole.RESEARCHER, 5),
    );
    expect(svc.findAll).toHaveBeenCalledWith({
      keyword: undefined,
      relationType: undefined,
      payStatus: undefined,
      alertLevel: undefined,
      deptId: 5,
    });
  });

  it('findAll 无 user → deptId=undefined', async () => {
    await controller.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(svc.findAll).toHaveBeenCalledWith({
      keyword: undefined,
      relationType: undefined,
      payStatus: undefined,
      alertLevel: undefined,
      deptId: undefined,
    });
  });

  it('alertSummary 委托 svc', async () => {
    await controller.alertSummary(mockAuthUser());
    expect(svc.alertSummary).toHaveBeenCalled();
  });

  it('generatePlans 传 patents', async () => {
    const patents: PatentForPlan[] = [
      {
        id: 1,
        name: 'p',
        nextFeeDate: '2030-01-01',
        feeAmount: 100,
        deptId: 5,
      },
    ];
    await controller.generatePlans(patents, mockAuthUser());
    expect(svc.generatePlansFromPatents).toHaveBeenCalledWith(
      patents,
      mockAuthUser(),
    );
  });

  it('generatePlans patents 为 undefined → 传空数组', async () => {
    await controller.generatePlans(undefined as never, mockAuthUser());
    expect(svc.generatePlansFromPatents).toHaveBeenCalledWith(
      [],
      mockAuthUser(),
    );
  });

  it('嵌套 plans 路由', async () => {
    await controller.listPlans(7);
    expect(plansSvc.findByFee).toHaveBeenCalledWith(7);
    await controller.createPlan(7, { dueDate: '2030-01-01' });
    expect(plansSvc.create).toHaveBeenCalledWith({
      dueDate: '2030-01-01',
      feeId: 7,
    });
  });

  it('嵌套 payments 路由', async () => {
    await controller.listPayments(7);
    expect(paymentsSvc.findByFee).toHaveBeenCalledWith(7);
    await controller.createPayment(7, {
      paymentAmount: 100,
      paymentDate: '2030-01-01',
    });
    expect(paymentsSvc.create).toHaveBeenCalledWith(7, {
      paymentAmount: 100,
      paymentDate: '2030-01-01',
    });
  });

  it('主资源 findOne / update / remove', async () => {
    await controller.findOne(1);
    await controller.update(1, { remark: 'r' });
    await controller.remove(1);
    expect(svc.findOne).toHaveBeenCalledWith(1);
    expect(svc.update).toHaveBeenCalledWith(1, { remark: 'r' });
    expect(svc.remove).toHaveBeenCalledWith(1);
  });
});

describe('FeePlansController', () => {
  let controller: FeePlansController;
  let plansSvc: MockObject;

  beforeEach(() => {
    plansSvc = mockPlansService();
    controller = new FeePlansController(plansSvc as unknown as FeePlansService);
  });

  it('update 委托', async () => {
    await controller.update(1, { amount: 1 } as never);
    expect(plansSvc.update).toHaveBeenCalledWith(1, { amount: 1 });
  });

  it('remove 委托', async () => {
    await controller.remove(1);
    expect(plansSvc.remove).toHaveBeenCalledWith(1);
  });
});

describe('FeePaymentsController', () => {
  let controller: FeePaymentsController;
  let paymentsSvc: MockObject;
  let vouchersSvc: MockObject;

  beforeEach(() => {
    paymentsSvc = mockPaymentsService();
    vouchersSvc = mockVouchersService();
    controller = new FeePaymentsController(
      paymentsSvc as unknown as FeePaymentsService,
      vouchersSvc as unknown as FeeVouchersService,
    );
  });

  it('updateFinanceStatus 委托', async () => {
    await controller.updateFinanceStatus(1, {
      financeStatus: 'confirmed',
    });
    expect(paymentsSvc.updateFinanceStatus).toHaveBeenCalledWith(1, {
      financeStatus: 'confirmed',
    });
  });

  it('createVoucher 注入 paymentRecordId', async () => {
    await controller.createVoucher(5, { voucherNo: 'V1' } as never);
    expect(vouchersSvc.create).toHaveBeenCalledWith({
      voucherNo: 'V1',
      paymentRecordId: 5,
    });
  });
});
