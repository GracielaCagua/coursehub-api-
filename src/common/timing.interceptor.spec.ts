import { jest } from '@jest/globals';
import {
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { TimingInterceptor } from './timing.interceptor';

describe('TimingInterceptor', () => {
  const interceptor = new TimingInterceptor();
  const context = {} as ExecutionContext;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs handler duration and preserves the response', async () => {
    const logger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const next: CallHandler<{ id: number }> = {
      handle: () => of({ id: 1 }),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({ id: 1 });
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching(/^Handler duration: \d+ms$/),
    );
  });

  it('logs handler duration and propagates errors', async () => {
    const logger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const expectedError = new Error('request failed');
    const next: CallHandler<unknown> = {
      handle: () => throwError(() => expectedError),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(expectedError);
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching(/^Handler duration: \d+ms$/),
    );
  });
});
