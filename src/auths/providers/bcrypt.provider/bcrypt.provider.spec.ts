import { BcryptProvider } from './bcrypt.provider';

describe('BcryptProvider', () => {
  let provider: BcryptProvider;

  beforeEach(() => {
    provider = new BcryptProvider();
  });

  describe('hashPassword', () => {
    it('should return a hash different from the input', async () => {
      const password = 'mySecret123';
      const hash = await provider.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
    });

    it('should produce different hashes for the same input (salted)', async () => {
      const password = 'mySecret123';
      const hash1 = await provider.hashPassword(password);
      const hash2 = await provider.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle Buffer input', async () => {
      const buffer = Buffer.from('bufferPassword');
      const hash = await provider.hashPassword(buffer);

      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('bufferPassword');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'correctPassword';
      const hash = await provider.hashPassword(password);

      const result = await provider.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await provider.hashPassword('correctPassword');

      const result = await provider.comparePassword('wrongPassword', hash);

      expect(result).toBe(false);
    });

    it('should handle Buffer input for comparison', async () => {
      const password = 'bufferTest';
      const hash = await provider.hashPassword(password);
      const buffer = Buffer.from(password);

      const result = await provider.comparePassword(buffer, hash);

      expect(result).toBe(true);
    });
  });
});
