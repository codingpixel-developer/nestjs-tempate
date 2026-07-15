/**
 * A global response transformer. Each registered transformer receives the
 * outgoing response payload and returns a transformed copy. Implement this and
 * add it to the RESPONSE_TRANSFORMERS array in app.module.ts to plug in a new
 * global transformation — the interceptor picks it up with no other changes.
 */
export interface ResponseTransformer {
  transform(payload: unknown): unknown;
}

export const RESPONSE_TRANSFORMERS = Symbol('RESPONSE_TRANSFORMERS');
