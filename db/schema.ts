import { sqliteTable, integer, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const revisions = sqliteTable('revisions', {
 version: integer('version').primaryKey(), operationId: text('operation_id').notNull(), createdAt: text('created_at').notNull(), actor: text('actor').notNull(), label: text('label').notNull(), payload: text('payload').notNull(),
}, t => [uniqueIndex('revisions_operation_unique').on(t.operationId)]);
export const assistantMessages = sqliteTable('assistant_messages', {
 id: text('id').primaryKey(), day: text('day').notNull(), createdAt: text('created_at').notNull(), question: text('question').notNull(), answer: text('answer').notNull().default(''), status: text('status').notNull(), model: text('model').notNull(), stateVersion: integer('state_version').notNull(), inputTokens: integer('input_tokens').notNull().default(0), outputTokens: integer('output_tokens').notNull().default(0),
}, t => [index('assistant_messages_day_idx').on(t.day)]);
export const journalRevisions = sqliteTable('journal_revisions', {
 entryId:text('entry_id').notNull(),version:integer('version').notNull(),operationId:text('operation_id').notNull(),createdAt:text('created_at').notNull(),payload:text('payload').notNull(),
},t=>[uniqueIndex('journal_entry_version').on(t.entryId,t.version),uniqueIndex('journal_operation').on(t.operationId)]);
export const journalMedia = sqliteTable('journal_media', {
 id:text('id').primaryKey(),mime:text('mime').notNull(),kind:text('kind').notNull(),size:integer('size').notNull(),digest:text('digest').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),
});
