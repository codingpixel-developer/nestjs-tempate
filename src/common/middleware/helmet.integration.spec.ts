import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import request from 'supertest';
import { App } from 'supertest/types';

@Controller()
class PingController {
  @Get('ping')
  ping() {
    return 'ok';
  }
}

describe('Helmet security headers (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(helmet({ contentSecurityPolicy: false }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('sets core security headers', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('does not set a Content-Security-Policy (disabled for Swagger UI)', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});
