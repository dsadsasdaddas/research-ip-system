import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * §6.2 / §7 全局异常过滤器
 * 统一所有错误响应的 shape: { statusCode, message, error, timestamp }
 * - HttpException → 用其自身的 status + message(message 可能是数组,如 ValidationPipe → 用 ", " 拼接)
 * - 其它未知异常 → 记录日志,返回 500, message 固定为「服务器内部错误」
 *
 * 前端 frontend/src/api/http.js 读取 err.response.data.message,故 `message` 字段必须存在。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();

      let message: string;
      let errorName: string;

      // exception.getResponse() 可能是 string | string[] | { message, error }
      if (typeof exResponse === 'string') {
        message = exResponse;
        errorName = exception.name;
      } else if (Array.isArray(exResponse)) {
        message = exResponse.join(', ');
        errorName = exception.name;
      } else if (exResponse && typeof exResponse === 'object') {
        const obj = exResponse as { message?: unknown; error?: unknown };
        const rawMessage = obj.message;
        if (Array.isArray(rawMessage)) {
          message = rawMessage.map((m) => String(m)).join(', ');
        } else if (rawMessage !== undefined && rawMessage !== null) {
          message = String(rawMessage);
        } else {
          message = exception.message;
        }
        errorName =
          obj.error !== undefined && obj.error !== null
            ? String(obj.error)
            : exception.name;
      } else {
        message = exception.message;
        errorName = exception.name;
      }

      response.status(status).json({
        statusCode: status,
        message,
        error: errorName,
        timestamp,
      });
      return;
    }

    // 未知异常:记录详细堆栈,返回统一的 500
    const errorInstance = exception as Error;
    const stack = errorInstance?.stack ?? '';
    const errMsg = errorInstance?.message ?? String(exception);
    this.logger.error(
      `未处理异常: ${request.method} ${request.url} -> ${errMsg}`,
      stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      error: 'Internal Server Error',
      timestamp,
    });
  }
}
