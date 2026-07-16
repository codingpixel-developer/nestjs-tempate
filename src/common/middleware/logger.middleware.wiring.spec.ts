import {
  Controller,
  Get,
  INestApplication,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { LoggerMiddleware } from './logger.middleware';

@Controller()
class RoutesController {
  @Get('ping')
  ping() {
    return 'pong';
  }

  @Get('health')
  health() {
    return 'ok';
  }

  @Get('api/foo')
  apiFoo() {
    return 'foo';
  }
}

@Module({ controllers: [RoutesController] })
class WiringTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

describe('LoggerMiddleware (wiring)', () => {
  let app: INestApplication<App>;

  // Boot first, then spy — so Nest's own bootstrap/routing logs are not captured.
  const bootApp = async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WiringTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  };

  afterEach(async () => {
    jest.restoreAllMocks();
    await app?.close();
  });

  it('applies to all routes and logs the request', async () => {
    await bootApp();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await request(app.getHttpServer()).get('/ping').expect(200);

    expect(
      logSpy.mock.calls.some((c) => String(c[0]).includes('GET /ping 200')),
    ).toBe(true);
  });

  it('does not log excluded paths (health, swagger api)', async () => {
    await bootApp();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/api/foo').expect(200);

    const logged = [...logSpy.mock.calls, ...warnSpy.mock.calls].map((c) =>
      String(c[0]),
    );
    // control: a non-excluded route IS logged (proves the spy captures requests)
    expect(logged.some((m) => m.includes('GET /ping 200'))).toBe(true);
    expect(logged.some((m) => m.includes('/health'))).toBe(false);
    expect(logged.some((m) => m.includes('/api/foo'))).toBe(false);
  });
});
