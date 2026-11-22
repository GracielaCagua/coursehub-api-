import { jest } from '@jest/globals';
import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as ArgumentsHost;
  const filter = new ApiExceptionFilter();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a consistent shape for HTTP errors', () => {
    filter.catch(new NotFoundException('Course not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Course not found',
      error: 'Not Found',
    });
  });

  it('does not expose internal exception messages or stack traces', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const internalError = new Error('password=secret; database stack');

    filter.catch(internalError, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('secret');
    logger.mockRestore();
  });
});
