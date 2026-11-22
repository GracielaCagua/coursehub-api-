import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';

describe('RequestLoggingMiddleware', () => {
  it('logs route metadata and status without request data or query strings', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    let onFinish: (() => void) | undefined;
    const request = {
      method: 'PATCH',
      route: { path: '/courses/:id' },
      originalUrl: '/courses/1?token=secret',
      headers: { authorization: 'Bearer secret' },
      body: { password: 'secret' },
    } as unknown as Request;
    const response = {
      statusCode: 403,
      on: (_event: string, callback: () => void) => {
        onFinish = callback;
      },
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    new RequestLoggingMiddleware().use(request, response, next);
    onFinish?.();

    expect(next).toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching(/^PATCH \/courses\/:id 403 \d+ms$/),
    );
    expect(logger.mock.calls.flat().join(' ')).not.toContain('secret');
    logger.mockRestore();
  });
});
