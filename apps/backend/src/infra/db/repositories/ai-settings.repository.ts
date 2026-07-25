import { platformSettings } from '@finance/db';
import { eq } from 'drizzle-orm';
import type { AiSettingsRepository } from '../../../application/ports/ai-settings-repository';
import type { DbHandle } from '../handle';

export function createAiSettingsRepository(db: DbHandle): AiSettingsRepository {
  return {
    async get() {
      const existing = await db.query.platformSettings.findFirst();
      if (existing) return existing;
      // Defensivo — a migration já cria a linha única, mas não depende disso pra sempre.
      const [row] = await db.insert(platformSettings).values({}).returning();
      if (!row) throw new Error('falha ao criar platform_settings');
      return row;
    },
    async update(patch) {
      const existing = await db.query.platformSettings.findFirst();
      if (!existing) {
        const [row] = await db
          .insert(platformSettings)
          .values(patch)
          .returning();
        if (!row) throw new Error('falha ao criar platform_settings');
        return row;
      }
      const [row] = await db
        .update(platformSettings)
        .set(patch)
        .where(eq(platformSettings.id, existing.id))
        .returning();
      if (!row) throw new Error('falha ao atualizar platform_settings');
      return row;
    },
  };
}
