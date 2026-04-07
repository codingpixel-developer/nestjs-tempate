import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminController } from '@/admin/admin.controller';
import { AdminService } from '@/admin/providers/admin.service/admin.service';

describe('AdminController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      adminLogin: jest
        .fn()
        .mockResolvedValue({ accessToken: 'token', admin: { id: 1 } }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: { id: number; email: string } }).user = {
        id: 1,
        email: 'admin@example.com',
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

  describe('POST /admin/login', () => {
    const validBody = { email: 'admin@example.com', password: 'StrongPass1!' };

    it('should return 201 on successful login', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send(validBody)
        .expect(201);
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send({ password: 'StrongPass1!' })
        .expect(400);
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: 'not-email', password: 'StrongPass1!' })
        .expect(400);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: 'admin@example.com', password: 'Ab1!' })
        .expect(400);
    });

    it('should return 400 when password is missing uppercase', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: 'admin@example.com', password: 'weakpass1!' })
        .expect(400);
    });

    it('should return 400 when password is missing special char', () => {
      return request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: 'admin@example.com', password: 'StrongPass1' })
        .expect(400);
    });
  });

  describe('PUT /admin/change-password', () => {
    const validBody = {
      currentPassword: 'OldPass1#ok',
      newPassword: 'NewPass1#ok',
    };

    it('should return 200 on successful change', () => {
      return request(app.getHttpServer())
        .put('/admin/change-password')
        .send(validBody)
        .expect(200);
    });

    it('should return 400 when currentPassword is missing', () => {
      return request(app.getHttpServer())
        .put('/admin/change-password')
        .send({ newPassword: 'NewPass1#ok' })
        .expect(400);
    });

    it('should return 400 when newPassword is weak', () => {
      return request(app.getHttpServer())
        .put('/admin/change-password')
        .send({ currentPassword: 'OldPass1#ok', newPassword: 'weak' })
        .expect(400);
    });
  });
});
