import type { OauthAccount } from '../../domain/entities/oauth-account';

export interface OauthAccountRepository {
  findByProvider(
    provider: string,
    providerAccountId: string
  ): Promise<OauthAccount | undefined>;
  create(data: {
    userId: string;
    provider: string;
    providerAccountId: string;
    email: string;
  }): Promise<void>;
}
