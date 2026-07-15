import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust the first proxy hop so `req.ip` is the real client IP (throttling,
  // logging) behind a reverse proxy / load balancer. Adjust the count to match
  // how many proxies sit in front of the app.
  app.set('trust proxy', 1);

  // Enable CORS
  app.enableCors({
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const appName = process.env.APP_NAME ?? 'Template';

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(`API documentation for ${appName}`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 5613;

  await app.listen(port);
}
bootstrap();
