import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { mockExecutionContext } from '../../testing/mocks';

function run(exception: unknown): {
  status: jest.Mock;
  json: jest.Mock;
} {
  const res: Record<string, jest.Mock> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = mockExecutionContext({
    request: { method: 'POST', url: '/api/x' },
    response: res,
  });
  new AllExceptionsFilter().catch(exception, host);
  return { status: res.status, json: res.json };
}

describe('AllExceptionsFilter', () => {
  it('HttpException(string) → 用字符串做 message', () => {
    const { status, json } = run(new HttpException('boom', 400));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'boom' }),
    );
  });

  it('HttpException(array) → 用 ", " 拼接', () => {
    const { json } = run(new HttpException(['e1', 'e2'], 400));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'e1, e2' }),
    );
  });

  it('HttpException(object {message:string, error}) → 取 message 与 error', () => {
    const { json } = run(new BadRequestException('参数错'));
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.message).toBe('参数错');
    expect(body.error).toBe('Bad Request');
  });

  it('HttpException(object {message:array}) → 拼接', () => {
    const { json } = run(new BadRequestException(['a', 'b']));
    expect(json.mock.calls[0][0].message).toBe('a, b');
  });

  it('HttpException(object 无 message) → 回退 exception.message, error 回退 name', () => {
    const { json } = run(new HttpException({}, 418));
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.error).toBe('HttpException');
  });

  it('HttpException(number response) → 回退 exception.message', () => {
    const { json } = run(new HttpException(123 as never, 400));
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.statusCode).toBe(400);
  });

  it('未知 Error → 500 + 统一文案 + 记日志', () => {
    const filter = new AllExceptionsFilter();
    const errorSpy = jest
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);
    const res: Record<string, jest.Mock> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const host = mockExecutionContext({
      request: { method: 'POST', url: '/api/x' },
      response: res,
    });
    filter.catch(new Error('db down'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: '服务器内部错误',
        error: 'Internal Server Error',
      }),
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('未知非 Error 异常 → 用 String(exception) 作日志,不抛错', () => {
    const filter = new AllExceptionsFilter();
    const errorSpy = jest
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);
    const res: Record<string, jest.Mock> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const host = mockExecutionContext({
      request: { method: 'GET', url: '/api/y' },
      response: res,
    });
    expect(() => filter.catch('plain string error', host)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
