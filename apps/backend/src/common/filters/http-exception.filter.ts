import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || exception.message;
        error = res.error || 'Error';

        if (Array.isArray(res.message)) {
          details = res.message.map((msg: string) => ({
            field: msg.split(' ')[0] || 'unknown',
            message: msg,
          }));
          message = 'Validation failed';
        }
      }
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      ...(details && { details }),
    });
  }
}
