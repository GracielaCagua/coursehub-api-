import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      const route =
        typeof request.route?.path === 'string'
          ? request.route.path
          : 'unmatched-route';
      this.logger.log(
        `${request.method} ${route} ${response.statusCode} ${Date.now() - startedAt}ms`,
      );
    });

    next();
  }
}
