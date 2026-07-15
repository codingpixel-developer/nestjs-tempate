import { ConfigService } from '@nestjs/config';
import { AssetUrl } from '../decorators/asset-url.decorator';
import { AssetUrlTransformer } from './asset-url.transformer';

class Sample {
  @AssetUrl()
  profileImage = '';

  @AssetUrl()
  images: string[] = [];
}
void Sample;

const makeTransformer = (apiUrl: string) => {
  const config = {
    get: jest.fn().mockReturnValue(apiUrl),
  } as unknown as ConfigService;
  return new AssetUrlTransformer(config);
};

describe('AssetUrlTransformer', () => {
  const t = makeTransformer('https://api.test');

  it('prepends the base URL to a relative asset field', () => {
    expect(t.transform({ profileImage: 'uploads/x.jpg', name: 'Bob' })).toEqual(
      {
        profileImage: 'https://api.test/uploads/x.jpg',
        name: 'Bob',
      },
    );
  });

  it('leaves already-absolute URLs untouched', () => {
    expect(t.transform({ profileImage: 'https://cdn.com/y.jpg' })).toEqual({
      profileImage: 'https://cdn.com/y.jpg',
    });
  });

  it('leaves null and empty values untouched', () => {
    expect(t.transform({ profileImage: null })).toEqual({ profileImage: null });
    expect(t.transform({ profileImage: '' })).toEqual({ profileImage: '' });
  });

  it('does not transform non-asset fields', () => {
    expect(t.transform({ name: 'uploads/x.jpg' })).toEqual({
      name: 'uploads/x.jpg',
    });
  });

  it('recurses into nested objects and arrays', () => {
    const input = {
      user: { profileImage: 'a.jpg' },
      items: [{ profileImage: 'b.jpg' }, { profileImage: 'c.jpg' }],
    };
    expect(t.transform(input)).toEqual({
      user: { profileImage: 'https://api.test/a.jpg' },
      items: [
        { profileImage: 'https://api.test/b.jpg' },
        { profileImage: 'https://api.test/c.jpg' },
      ],
    });
  });

  it('does not mutate the input', () => {
    const input = { profileImage: 'x.jpg' };
    t.transform(input);
    expect(input.profileImage).toBe('x.jpg');
  });

  it('normalizes slashes between base URL and path', () => {
    const tt = makeTransformer('https://api.test/');
    expect(tt.transform({ profileImage: '/uploads/x.jpg' })).toEqual({
      profileImage: 'https://api.test/uploads/x.jpg',
    });
  });

  it('leaves paths untouched when no base URL is configured', () => {
    const tt = makeTransformer('');
    expect(tt.transform({ profileImage: 'uploads/x.jpg' })).toEqual({
      profileImage: 'uploads/x.jpg',
    });
  });

  it('transforms arrays of asset paths', () => {
    expect(
      t.transform({ images: ['a.jpg', 'https://cdn.com/b.jpg', ''] }),
    ).toEqual({
      images: ['https://api.test/a.jpg', 'https://cdn.com/b.jpg', ''],
    });
  });

  it('leaves Date and Buffer values untouched', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    const buffer = Buffer.from('x');
    const result = t.transform({ createdAt: date, file: buffer }) as {
      createdAt: Date;
      file: Buffer;
    };
    expect(result.createdAt).toBe(date);
    expect(result.file).toBe(buffer);
  });

  it('does not infinite-loop on circular references', () => {
    const node: Record<string, unknown> = { profileImage: 'x.jpg' };
    node.self = node;
    let result: Record<string, unknown> = {};
    expect(() => {
      result = t.transform(node) as Record<string, unknown>;
    }).not.toThrow();
    expect(result.profileImage).toBe('https://api.test/x.jpg');
  });
});
