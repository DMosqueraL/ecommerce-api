import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, errors } =
      exception instanceof HttpException
        ? this.resolveResponse(exception)
        : { message: 'Internal server error', errors: undefined };

    response.status(statusCode).json({
      statusCode,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveResponse(exception: HttpException): { message: string; errors?: string[] } {
    const response = exception.getResponse();
    if (typeof response === 'string') return { message: response };
    if (typeof response === 'object' && 'message' in response) {
      const msg = (response as Record<string, unknown>).message;
      if (Array.isArray(msg)) return { message: 'Error de validación', errors: msg };
      return { message: String(msg) };
    }
    return { message: exception.message };
  }
}
