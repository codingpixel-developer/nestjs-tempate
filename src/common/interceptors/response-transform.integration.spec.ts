import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssetUrl } from '../decorators/asset-url.decorator';
import { AssetUrlTransformer } from '../transformers/asset-url.transformer';
import { RESPONSE_TRANSFORMERS } from '../transformers/response-transformer.interface';
import { ResponseTransformInterceptor } from './response-transform.interceptor';

class ProfileDto {
  @AssetUrl()
  avatar = '';

  name = '';
}

@Controller('profile')
class ProfileController {
  @Get()
  get() {
    const dto = new ProfileDto();
    dto.avatar = 'uploads/avatar.png';
    dto.name = 'Bob';
    return dto;
  }
}

describe('Response transform (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ app: { apiUrl: 'https://api.test' } })],
        }),
      ],
      controllers: [ProfileController],
      providers: [
        AssetUrlTransformer,
        {
          provide: RESPONSE_TRANSFORMERS,
          useFactory: (assetUrl: AssetUrlTransformer) => [assetUrl],
          inject: [AssetUrlTransformer],
        },
        { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('expands @AssetUrl fields to full URLs in the response', async () => {
    const res = await request(app.getHttpServer()).get('/profile').expect(200);
    expect(res.body).toEqual({
      avatar: 'https://api.test/uploads/avatar.png',
      name: 'Bob',
    });
  });
});
