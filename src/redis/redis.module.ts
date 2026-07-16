import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '@/config/redis.config';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const config = configService.get<RedisConfig>('redis');
        // lazyConnect keeps app boot clean when Redis is not yet reachable;
        // the connection opens on the first command.
        return new Redis(config?.url ?? 'redis://localhost:6379', {
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
