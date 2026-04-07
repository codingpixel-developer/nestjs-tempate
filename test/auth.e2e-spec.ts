import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthsController } from '@/auths/auths.controller';
import { AuthsService } from '@/auths/providers/auths.service/auths.service';

describe('AuthsController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      login: jest
        .fn()
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      refreshToken: jest
        .fn()
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'Email sent' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset' }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthsController],
      providers: [{ provide: AuthsService, useValue: mockService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: { id: number; email: string } }).user = {
        id: 1,
        email: 'user@example.com',
      };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    const validBody = { email: 'user@example.com', password: 'password1234' };

    it('should return 200 on successful login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(validBody)
        .expect(200);
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password1234' })
        .expect(400);
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad', password: 'password1234' })
        .expect(400);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should return 200 on successful refresh', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'some-valid-token' })
        .expect(200);
    });

    it('should return 400 when refreshToken is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 200 on success', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    const validBody = { token: 'reset-token', password: 'NewPass1#ok' };

    it('should return 200 on success', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(validBody)
        .expect(200);
    });

    it('should return 400 when token is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ password: 'NewPass1#ok' })
        .expect(400);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'reset-token', password: 'Ab1#' })
        .expect(400);
    });

    it('should return 400 when password is missing letter', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'reset-token', password: '12345678#!' })
        .expect(400);
    });
  });

  describe('POST /auth/change-password', () => {
    const validBody = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass1#ok',
    };

    it('should return 200 on success', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send(validBody)
        .expect(200);
    });

    it('should return 400 when currentPassword is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send({ newPassword: 'NewPass1#ok' })
        .expect(400);
    });

    it('should return 400 when newPassword is weak', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send({ currentPassword: 'OldPass123', newPassword: 'weak' })
        .expect(400);
    });
  });
});
