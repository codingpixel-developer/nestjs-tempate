import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminModule } from './admin.module';
import { AuthsModule } from '@/auths/auths.module';
import { GenerateTokensProvider } from '@/auths/providers/generate-tokens.provider/generate-tokens.provider';

describe('AdminModule wiring', () => {
  it('uses GenerateTokensProvider exported by AuthsModule instead of declaring its own', () => {
    const adminProviders =
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AdminModule) as
        unknown[] | undefined) ?? [];
    const authExports =
      (Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthsModule) as
        unknown[] | undefined) ?? [];

    expect(adminProviders).not.toContain(GenerateTokensProvider);
    expect(authExports).toContain(GenerateTokensProvider);
  });
});
