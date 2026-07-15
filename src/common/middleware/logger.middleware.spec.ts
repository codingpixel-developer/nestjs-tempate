import { Logger } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';

interface MockRes {
  statusCode: number;
  on: jest.Mock;
  emitFinish: () => void;
}

const createMockRes = (statusCode: number): MockRes => {
  const listeners: Record<string, () => void> = {};
  return {
    statusCode,
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    emitFinish() {
      listeners.finish?.();
    },
  };
};

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    jest.restoreAllMocks();
  });

  it('calls next()', () => {
    const next = jest.fn();
    const req = { method: 'GET', originalUrl: '/', ip: '::1' };
    middleware.use(req as never, createMockRes(200) as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs a 2xx request at log level with method, url and status', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const req = { method: 'GET', originalUrl: '/users', ip: '::1' };
    const res = createMockRes(200);
    middleware.use(req as never, res as never, jest.fn());
    res.emitFinish();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('GET /users 200');
  });

  it('logs a 4xx request at warn level', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const req = { method: 'GET', originalUrl: '/missing', ip: '::1' };
    const res = createMockRes(404);
    middleware.use(req as never, res as never, jest.fn());
    res.emitFinish();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('GET /missing 404');
  });

  it('logs a 5xx request at error level', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const req = { method: 'POST', originalUrl: '/boom', ip: '::1' };
    const res = createMockRes(500);
    middleware.use(req as never, res as never, jest.fn());
    res.emitFinish();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('POST /boom 500');
  });

  it('does not log excluded paths (swagger api, health)', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const next = jest.fn();

    for (const originalUrl of [
      '/api',
      '/api/docs',
      '/health',
      '/health/live',
    ]) {
      const res = createMockRes(200);
      middleware.use(
        { method: 'GET', originalUrl, ip: '::1' } as never,
        res as never,
        next,
      );
      res.emitFinish();
    }

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('logs a slow 2xx request at warn level', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    // start = 1000, finish = 2500 → 1500ms elapsed (over the slow threshold)
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2500);
    const req = { method: 'GET', originalUrl: '/slow', ip: '::1' };
    const res = createMockRes(200);
    middleware.use(req as never, res as never, jest.fn());
    res.emitFinish();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('GET /slow 200');
  });
});
