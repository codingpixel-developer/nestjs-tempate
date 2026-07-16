import redisConfig from './redis.config';

describe('redisConfig', () => {
  const original = process.env;

  afterEach(() => {
    process.env = original;
  });

  it('reads REDIS_URL from env', () => {
    process.env = { ...original, REDIS_URL: 'redis://cache:6380' };
    expect(redisConfig()).toEqual({ url: 'redis://cache:6380' });
  });

  it('defaults to localhost when unset', () => {
    process.env = { ...original, REDIS_URL: undefined };
    expect(redisConfig()).toEqual({ url: 'redis://localhost:6379' });
  });
});
