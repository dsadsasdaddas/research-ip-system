import { DictionariesController } from './dictionaries.controller';
import type { DictionariesService } from './dictionaries.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findTypes: jest.fn().mockResolvedValue([{ id: 1 }]),
    findTypeByCode: jest.fn().mockResolvedValue({ id: 1, code: 'x' }),
    createType: jest.fn().mockResolvedValue({ id: 1 }),
    updateType: jest.fn().mockResolvedValue({ id: 1 }),
    removeType: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
    findItems: jest.fn().mockResolvedValue([{ id: 1 }]),
    findItem: jest.fn().mockResolvedValue({ id: 1 }),
    createItem: jest.fn().mockResolvedValue({ id: 1 }),
    updateItem: jest.fn().mockResolvedValue({ id: 1 }),
    removeItem: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
  };
}

describe('DictionariesController', () => {
  let controller: DictionariesController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new DictionariesController(
      service as unknown as DictionariesService,
    );
  });

  it('findTypes 委托 service', async () => {
    await controller.findTypes();
    expect(service.findTypes).toHaveBeenCalled();
  });

  it('findType 委托 service(code)', async () => {
    await controller.findType('x');
    expect(service.findTypeByCode).toHaveBeenCalledWith('x');
  });

  it('createType 委托 service', async () => {
    await controller.createType({ code: 'x', name: 'n' });
    expect(service.createType).toHaveBeenCalledWith({ code: 'x', name: 'n' });
  });

  it('updateType 委托 service(id, dto)', async () => {
    await controller.updateType(1, { name: 'n' });
    expect(service.updateType).toHaveBeenCalledWith(1, { name: 'n' });
  });

  it('removeType 委托 service(id)', async () => {
    await controller.removeType(1);
    expect(service.removeType).toHaveBeenCalledWith(1);
  });

  it('findItems 委托 service(query)', async () => {
    await controller.findItems({ typeCode: 'x' });
    expect(service.findItems).toHaveBeenCalledWith({ typeCode: 'x' });
  });

  it('findItem 委托 service(id)', async () => {
    await controller.findItem(1);
    expect(service.findItem).toHaveBeenCalledWith(1);
  });

  it('createItem 委托 service', async () => {
    await controller.createItem({
      typeCode: 'x',
      label: 'l',
      value: 'v',
    });
    expect(service.createItem).toHaveBeenCalledWith({
      typeCode: 'x',
      label: 'l',
      value: 'v',
    });
  });

  it('updateItem 委托 service(id, dto)', async () => {
    await controller.updateItem(1, { label: 'l' });
    expect(service.updateItem).toHaveBeenCalledWith(1, { label: 'l' });
  });

  it('removeItem 委托 service(id)', async () => {
    await controller.removeItem(1);
    expect(service.removeItem).toHaveBeenCalledWith(1);
  });
});
