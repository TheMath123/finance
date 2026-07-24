import { relations } from 'drizzle-orm';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';
import { workspaces } from './workspace';

/**
 * Vínculo de uma conversa/grupo do WhatsApp a um workspace (spec: seção
 * "Chatbot WhatsApp"). `waChatId` é o identificador do chat na Cloud API —
 * em conversa privada é o próprio número (E.164); em grupo, o id do grupo.
 */
export const whatsappLinks = pgTable('whatsapp_links', {
  id: id(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  waChatId: text('wa_chat_id').notNull().unique(),
  linkedBy: uuid('linked_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
});

export const whatsappLinksRelations = relations(whatsappLinks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [whatsappLinks.workspaceId],
    references: [workspaces.id],
  }),
  linkedByUser: one(users, {
    fields: [whatsappLinks.linkedBy],
    references: [users.id],
  }),
}));

export type WhatsAppLink = typeof whatsappLinks.$inferSelect;
export type NewWhatsAppLink = typeof whatsappLinks.$inferInsert;
