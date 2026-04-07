import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/providers/users.service/users.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      signupUser: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com' }),
      updateCurrentUser: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Updated' }),
      findById: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: { id: number; email: string } }).user = {
        id: 1,
        email: 'john@example.com',
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

  describe('POST /users/signup', () => {
    const validBody = {
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should return 201 on successful signup', () => {
      return request(app.getHttpServer())
        .post('/users/signup')
        .send(validBody)
        .expect(201);
    });

    it('should return 400 when name is missing', () => {
      return request(app.getHttpServer())
        .post('/users/signup')
        .send({ email: 'john@example.com', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/users/signup')
        .send({ name: 'John', email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post('/users/signup')
        .send({ name: 'John', email: 'john@example.com' })
        .expect(400);
    });

    it('should return 400 when extra unknown fields are sent', () => {
      return request(app.getHttpServer())
        .post('/users/signup')
        .send({ ...validBody, unknownField: 'bad' })
        .expect(400);
    });
  });

  describe('PUT /users/update-user/1', () => {
    it('should return 200 on successful update', () => {
      return request(app.getHttpServer())
        .put('/users/update-user/1')
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should return 200 with empty body', () => {
      return request(app.getHttpServer())
        .put('/users/update-user/1')
        .send({})
        .expect(200);
    });
  });

  describe('GET /users/get-current-user', () => {
    it('should return 200', () => {
      return request(app.getHttpServer())
        .get('/users/get-current-user')
        .expect(200);
    });
  });
});
