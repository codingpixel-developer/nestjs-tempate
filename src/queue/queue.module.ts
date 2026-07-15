import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConfig } from '@/config/redis.config';
import { ExampleProcessor } from './example.processor';
import { DEFAULT_QUEUE } from './queue.constants';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = new URL(
          configService.get<RedisConfig>('redis')?.url ??
            'redis://localhost:6379',
        );
        return {
          connection: {
            host: url.hostname,
            port: url.port ? Number(url.port) : 6379,
            username: url.username || undefined,
            password: url.password || undefined,
            db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
            tls: url.protocol === 'rediss:' ? {} : undefined,
            // BullMQ requires this to be null for its blocking connections.
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: DEFAULT_QUEUE }),
  ],
  providers: [QueueService, ExampleProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
