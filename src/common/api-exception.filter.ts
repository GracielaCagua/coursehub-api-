import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const details =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)
          : undefined;
      const rawMessage = details?.message;
      const message =
        typeof rawMessage === 'string' ||
        (Array.isArray(rawMessage) &&
          rawMessage.every((item) => typeof item === 'string'))
          ? rawMessage
          : typeof body === 'string'
            ? body
            : exception.message;
      const error =
        typeof details?.error === 'string' ? details.error : exception.name;

      response.status(statusCode).json({ statusCode, message, error });
      return;
    }

    this.logger.error('Unhandled API exception');
    const errorResponse: ErrorResponse = {
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
    response.status(errorResponse.statusCode).json(errorResponse);
  }
}
