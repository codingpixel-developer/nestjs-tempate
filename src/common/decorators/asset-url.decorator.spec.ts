import { AssetUrl, isAssetField } from './asset-url.decorator';

class SampleEntity {
  @AssetUrl()
  profileImage = '';

  name = '';
}

describe('AssetUrl decorator', () => {
  it('registers a decorated field as an asset field', () => {
    void new SampleEntity();
    expect(isAssetField('profileImage')).toBe(true);
  });

  it('does not register undecorated fields', () => {
    expect(isAssetField('name')).toBe(false);
  });
});
