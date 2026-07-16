import { RefreshTokenStore } from './refresh-token-store.service';

describe('RefreshTokenStore', () => {
  let redis: {
    set: jest.Mock;
    exists: jest.Mock;
    del: jest.Mock;
    scan: jest.Mock;
  };
  let store: RefreshTokenStore;

  beforeEach(() => {
    redis = {
      set: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
    };
    store = new RefreshTokenStore(redis as never);
  });

  it('stores a jti with a TTL under a namespaced key', async () => {
    await store.store(1, 'jti-1', 3600);
    expect(redis.set).toHaveBeenCalledWith('refresh:1:jti-1', '1', 'EX', 3600);
  });

  it('isValid returns true when the key exists', async () => {
    redis.exists.mockResolvedValue(1);
    expect(await store.isValid(1, 'jti-1')).toBe(true);
    expect(redis.exists).toHaveBeenCalledWith('refresh:1:jti-1');
  });

  it('isValid returns false when the key is missing', async () => {
    redis.exists.mockResolvedValue(0);
    expect(await store.isValid(1, 'jti-1')).toBe(false);
  });

  it('revoke deletes the key', async () => {
    await store.revoke(1, 'jti-1');
    expect(redis.del).toHaveBeenCalledWith('refresh:1:jti-1');
  });

  it('revokeAll scans and deletes every key for the user', async () => {
    redis.scan
      .mockResolvedValueOnce(['5', ['refresh:1:a', 'refresh:1:b']])
      .mockResolvedValueOnce(['0', ['refresh:1:c']]);
    await store.revokeAll(1);
    expect(redis.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'refresh:1:*',
      'COUNT',
      100,
    );
    expect(redis.del).toHaveBeenCalledWith('refresh:1:a', 'refresh:1:b');
    expect(redis.del).toHaveBeenCalledWith('refresh:1:c');
  });
});
