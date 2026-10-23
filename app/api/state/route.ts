import { database, latest, ensureInitial, serialize, metadataSql, type Revision } from '../../../lib/store';
import { saveSchema, json, checkOrigin } from '../../../lib/travel';
import { readJson, RequestError } from '../../../lib/request';
import type { z } from 'zod';
function acknowledge(row: Revision, input: z.infer<typeof saveSchema>) {
    const saved = JSON.parse(row.payload);
    const submitted = { ...input.state, sources: input.state.sources ?? saved.sources, curation: input.state.curation ?? saved.curation };
    if (row.version !== input.baseVersion + 1 || row.label !== input.label || JSON.stringify(saved) !== JSON.stringify(submitted))
        return json({ error: 'Identificador já usado para outra edição. Sua alteração não foi salva.' }, 409);
    return json({ version: row.version, operationId: row.operation_id, at: row.created_at, duplicate: true });
}
export async function GET() { try {
    await ensureInitial();
    const row = await latest();
    const history = await database().prepare(metadataSql + ' ORDER BY version DESC LIMIT 100').all();
    return json({ ...serialize(row!), history: history.results });
}
catch {
    console.error('travel-read-failed');
    return json({ error: 'Não foi possível carregar a viagem. Tente novamente.' }, 503);
} }
export async function POST(r: Request) {
    if (!checkOrigin(r))
        return json({ error: 'Origem não autorizada.' }, 403);
    try {
        const input = await readJson(r, 700000);
        const parsed = saveSchema.safeParse(input);
        if (!parsed.success)
            return json({ error: 'Formato de dados inválido.' }, 400);
        const b = parsed.data, db = database();
        await ensureInitial();
        const existing = await db.prepare('SELECT * FROM revisions WHERE operation_id=?').bind(b.operationId).first<Revision>();
        if (existing)
            return acknowledge(existing, b);
        const current = await latest(), currentState = JSON.parse(current!.payload), sources = currentState.sources;
        // Older clients may omit sources; originals must never disappear during a plan save.
        if (b.state.sources !== undefined && JSON.stringify(b.state.sources) !== JSON.stringify(sources))
            return json({ error: 'Os materiais originais são preservados. Registre complementos no Caderno.' }, 409);
        b.state.sources = sources;
        // Older clients keep curated research intact when saving another part of the plan.
        b.state.curation ??= currentState.curation;
        const mediaIds=[...new Set(b.state.curation?.items.flatMap(item=>item.image?[item.image.mediaId]:[])||[])];
        for(const mediaId of mediaIds){const media=await db.prepare('SELECT status,kind FROM journal_media WHERE id=?').bind(mediaId).first<{status:string;kind:string}>();if(!media||media.status!=='ready'||media.kind!=='image')return json({error:'Uma imagem da curadoria ainda não foi confirmada. Nenhuma alteração foi gravada.'},400);}

        const actor = r.headers.get('oai-authenticated-user-id') ? 'Responsável (sessão autenticada)' : 'Assistente (acesso privado)', at = new Date().toISOString();
        const row = await db.prepare('INSERT INTO revisions (version,operation_id,created_at,actor,label,payload) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(MAX(version),0) FROM revisions)=? ON CONFLICT DO NOTHING RETURNING version').bind(b.baseVersion + 1, b.operationId, at, actor, b.label, JSON.stringify(b.state), b.baseVersion).first<{
            version: number;
        }>();
        if (!row) {
            const retry = await db.prepare('SELECT * FROM revisions WHERE operation_id=?').bind(b.operationId).first<Revision>();
            if (retry)
                return acknowledge(retry, b);
            return json({ error: 'A viagem mudou em outro dispositivo. Sua edição foi preservada neste dispositivo.', currentVersion: (await latest())?.version }, 409);
        }
        return json({ version: row.version, operationId: b.operationId, at });
    }
    catch (error) {
        if (error instanceof RequestError)
            return json({ error: error.message }, error.status);
        console.error('travel-save-failed');
        return json({ error: 'Não foi possível salvar. Sua edição permanece no dispositivo até nova tentativa.' }, 503);
    }
}
