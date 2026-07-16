import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// Successful requests slower than this (ms) are logged at warn level.
const SLOW_REQUEST_THRESHOLD_MS = 1000;

// Requests to these path prefixes are not logged (Swagger docs, health checks).
const EXCLUDED_PREFIXES = ['/api', '/health'];

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const pathname = originalUrl.split('?')[0];

    const isExcluded = EXCLUDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (isExcluded) {
      return next();
    }

    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      // `req.ip` is the proxy IP unless `trust proxy` is enabled in main.ts.
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${req.ip}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400 || duration > SLOW_REQUEST_THRESHOLD_MS) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
