import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import {
  RESPONSE_TRANSFORMERS,
  ResponseTransformer,
} from '../transformers/response-transformer.interface';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(
    @Inject(RESPONSE_TRANSFORMERS)
    private readonly transformers: ResponseTransformer[],
  ) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(
        map((data) =>
          this.transformers.reduce<unknown>(
            (acc, transformer) => transformer.transform(acc),
            data,
          ),
        ),
      );
  }
}
