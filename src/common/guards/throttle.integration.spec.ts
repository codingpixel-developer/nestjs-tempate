import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  SkipThrottle,
  Throttle,
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

@Controller()
class TestController {
  @Get('limited')
  limited() {
    return 'ok';
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Get('strict')
  strict() {
    return 'ok';
  }

  @SkipThrottle()
  @Get('open')
  open() {
    return 'ok';
  }
}

describe('Throttling (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 2 }])],
      controllers: [TestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows requests up to the global limit then returns 429', async () => {
    const server = app.getHttpServer();
    await request(server).get('/limited').expect(200);
    await request(server).get('/limited').expect(200);
    await request(server).get('/limited').expect(429);
  });

  it('applies a stricter @Throttle override', async () => {
    const server = app.getHttpServer();
    await request(server).get('/strict').expect(200);
    await request(server).get('/strict').expect(429);
  });

  it('bypasses @SkipThrottle routes', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i++) {
      await request(server).get('/open').expect(200);
    }
  });
});
