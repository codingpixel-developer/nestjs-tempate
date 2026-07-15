import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseTransformer } from '../transformers/response-transformer.interface';
import { ResponseTransformInterceptor } from './response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  const context = {} as ExecutionContext;
  const handlerReturning = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  it('pipes the response through every transformer in order', async () => {
    const upper: ResponseTransformer = {
      transform: (p) => String(p).toUpperCase(),
    };
    const exclaim: ResponseTransformer = {
      transform: (p) => `${String(p)}!`,
    };
    const interceptor = new ResponseTransformInterceptor([upper, exclaim]);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning('hi')),
    );

    expect(result).toBe('HI!');
  });

  it('returns the payload unchanged when no transformers are registered', async () => {
    const interceptor = new ResponseTransformInterceptor([]);

    const result = await lastValueFrom(
      interceptor.intercept(context, handlerReturning({ a: 1 })),
    );

    expect(result).toEqual({ a: 1 });
  });
});
