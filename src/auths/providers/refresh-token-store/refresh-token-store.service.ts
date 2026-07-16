import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/redis/redis.constants';

/**
 * Tracks issued refresh tokens in Redis so they can be validated and revoked
 * (real logout / token invalidation) on top of stateless JWT auth.
 */
@Injectable()
export class RefreshTokenStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(userId: number, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  async store(userId: number, jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(userId, jti), '1', 'EX', ttlSeconds);
  }

  async isValid(userId: number, jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(userId, jti))) === 1;
  }

  async revoke(userId: number, jti: string): Promise<void> {
    await this.redis.del(this.key(userId, jti));
  }

  async revokeAll(userId: number): Promise<void> {
    const pattern = `refresh:${userId}:*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
