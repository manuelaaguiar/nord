import { env } from 'cloudflare:workers';
import initial from '../data/initial.example.json';
export type Revision = {
    version: number;
    operation_id: string;
    created_at: string;
    actor: string;
    label: string;
    payload: string;
};
export function database() { if (!env.DB)
    throw new Error('Database unavailable'); return env.DB; }
export async function latest() { return database().prepare('SELECT * FROM revisions ORDER BY version DESC LIMIT 1').first<Revision>(); }
export async function ensureInitial() { await database().prepare('INSERT OR IGNORE INTO revisions (version,operation_id,created_at,actor,label,payload) SELECT 1,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM revisions)').bind('initial-v1', new Date().toISOString(), 'Plano original', 'Plano inicial e materiais originais', JSON.stringify(initial)).run(); }
export function serialize(row: Revision) { return { version: row.version, operationId: row.operation_id, at: row.created_at, actor: row.actor, label: row.label, state: JSON.parse(row.payload) }; }
export const metadataSql = 'SELECT version, operation_id AS id, created_at AS at, actor, label FROM revisions';
// Shared workspace protected by Sites owner-private dispatch. Service credentials
// are consumed upstream. Preserve owner-private audience; public sharing would
// require a new authorization design. No credential is present in browser code.
