import throttleConfig from './throttle.config';

describe('throttleConfig', () => {
  const original = process.env;

  afterEach(() => {
    process.env = original;
  });

  it('reads THROTTLE_TTL (seconds) and THROTTLE_LIMIT from env', () => {
    process.env = { ...original, THROTTLE_TTL: '30', THROTTLE_LIMIT: '10' };
    expect(throttleConfig()).toEqual({ ttl: 30000, limit: 10 });
  });

  it('falls back to defaults (60s / 60) when env is unset', () => {
    process.env = {
      ...original,
      THROTTLE_TTL: undefined,
      THROTTLE_LIMIT: undefined,
    };
    expect(throttleConfig()).toEqual({ ttl: 60000, limit: 60 });
  });
});
