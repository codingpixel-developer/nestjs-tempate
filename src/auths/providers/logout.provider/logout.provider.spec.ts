import { LogoutProvider } from './logout.provider';

describe('LogoutProvider', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let store: { revoke: jest.Mock; revokeAll: jest.Mock };
  let provider: LogoutProvider;

  const jwtConfiguration = { secret: 's', audience: 'a', issuer: 'i' };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    store = { revoke: jest.fn(), revokeAll: jest.fn() };
    provider = new LogoutProvider(
      jwtService as never,
      jwtConfiguration as never,
      store as never,
    );
  });

  it('revokes the jti from a valid refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 1, jti: 'j1' });
    const result = await provider.logout('token');
    expect(store.revoke).toHaveBeenCalledWith(1, 'j1');
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('throws Unauthorized for an invalid refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad'));
    await expect(provider.logout('token')).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(store.revoke).not.toHaveBeenCalled();
  });

  it('logoutAll revokes every token for the user', async () => {
    const result = await provider.logoutAll(5);
    expect(store.revokeAll).toHaveBeenCalledWith(5);
    expect(result).toEqual({ message: 'Logged out from all devices' });
  });
});
