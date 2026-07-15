/**
 * Marks an entity/DTO property as holding a relative asset path (e.g. an
 * upload key) that should be expanded to a full URL in API responses by the
 * AssetUrlTransformer.
 *
 * Matching is by field name (responses are plain objects by the time the
 * global interceptor runs, so class identity is not available). Keep asset
 * field names distinctive.
 */
const assetUrlFields = new Set<string>();

export function AssetUrl(): PropertyDecorator {
  return (_target, propertyKey) => {
    assetUrlFields.add(propertyKey.toString());
  };
}

export function isAssetField(field: string): boolean {
  return assetUrlFields.has(field);
}
