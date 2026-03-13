import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthsModule } from './auths/auths.module';
import { MailsModule } from './mails/mails.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig, { DatabaseConfig } from './config/database.config';
import appConfig from './config/app.config';
import mailConfig from './config/mail.config';
import validationSchema from './config/env.validation';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenGuard } from './auths/guards/access-token.guard';
import { AdminGuard } from './auths/guards/admin.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthenticationGuard } from './auths/guards/authentication.guard';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import { AdminModule } from './admin/admin.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, mailConfig],
      validationSchema,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database config not found');
        }
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.name,
          synchronize: dbConfig.synchronize,
          autoLoadEntities: dbConfig.autoLoadEntities,
          extra: {
            statement_timeout: 20000,
            query_timeout: 20000,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    UsersModule,
    AuthsModule,
    MailsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AccessTokenGuard,
    AdminGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DataResponseInterceptor,
    },
  ],
})
export class AppModule {}
