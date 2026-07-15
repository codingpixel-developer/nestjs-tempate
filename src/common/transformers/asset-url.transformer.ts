import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAssetField } from '../decorators/asset-url.decorator';
import { ResponseTransformer } from './response-transformer.interface';

/**
 * Expands relative asset paths (fields marked with `@AssetUrl()`) into full
 * URLs using the configured `APP_URL`. Walks the response tree immutably.
 */
@Injectable()
export class AssetUrlTransformer implements ResponseTransformer {
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = (configService.get<string>('app.apiUrl') ?? '').replace(
      /\/+$/,
      '',
    );
  }

  transform(payload: unknown): unknown {
    return this.walk(payload, new WeakSet());
  }

  private walk(value: unknown, seen: WeakSet<object>): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.walk(item, seen));
    }

    if (this.isRecordLike(value)) {
      if (seen.has(value)) {
        return value;
      }
      seen.add(value);

      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = isAssetField(key)
          ? this.transformAsset(val, seen)
          : this.walk(val, seen);
      }
      return result;
    }

    return value;
  }

  private transformAsset(value: unknown, seen: WeakSet<object>): unknown {
    if (typeof value === 'string') {
      return this.toUrl(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'string' ? this.toUrl(item) : this.walk(item, seen),
      );
    }
    return this.walk(value, seen);
  }

  private toUrl(path: string): string {
    if (!this.baseUrl || path === '' || this.isAbsolute(path)) {
      return path;
    }
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private isAbsolute(value: string): boolean {
    return /^(https?:\/\/|data:|\/\/)/i.test(value);
  }

  private isRecordLike(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    if (value instanceof Date || Buffer.isBuffer(value)) {
      return false;
    }
    return true;
  }
}
