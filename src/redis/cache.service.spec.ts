import { CacheService } from './cache.service';

describe('CacheService', () => {
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let service: CacheService;

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    service = new CacheService(redis as never);
  });

  it('get returns the parsed value', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    expect(await service.get('k')).toEqual({ a: 1 });
  });

  it('get returns null on a miss', async () => {
    redis.get.mockResolvedValue(null);
    expect(await service.get('k')).toBeNull();
  });

  it('set serializes the value with a TTL', async () => {
    await service.set('k', { a: 1 }, 30);
    expect(redis.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ a: 1 }),
      'EX',
      30,
    );
  });

  it('set without a TTL omits the expiry', async () => {
    await service.set('k', 'v');
    expect(redis.set).toHaveBeenCalledWith('k', JSON.stringify('v'));
  });

  it('del removes the key', async () => {
    await service.del('k');
    expect(redis.del).toHaveBeenCalledWith('k');
  });

  it('wrap returns the cached value without calling the factory', async () => {
    redis.get.mockResolvedValue(JSON.stringify('cached'));
    const factory = jest.fn();
    expect(await service.wrap('k', factory)).toBe('cached');
    expect(factory).not.toHaveBeenCalled();
  });

  it('wrap computes, caches, and returns the value on a miss', async () => {
    redis.get.mockResolvedValue(null);
    const factory = jest.fn().mockResolvedValue('fresh');
    expect(await service.wrap('k', factory, 60)).toBe('fresh');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify('fresh'),
      'EX',
      60,
    );
  });
});
