import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { finalize, Observable } from 'rxjs';

@Injectable()
export class TimingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(TimingInterceptor.name);

  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        this.logger.log(`Handler duration: ${Date.now() - startedAt}ms`);
      }),
    );
  }
}
