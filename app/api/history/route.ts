import { database, metadataSql, serialize, type Revision } from '../../../lib/store';
import { json } from '../../../lib/travel';
export async function GET(r: Request) { try {
    const u = new URL(r.url), version = u.searchParams.get('version');
    if (version) {
        if (!/^\d+$/.test(version))
            return json({ error: 'Versão inválida' }, 400);
        const row = await database().prepare('SELECT * FROM revisions WHERE version=?').bind(Number(version)).first<Revision>();
        return row ? json(serialize(row)) : json({ error: 'Versão não encontrada' }, 404);
    }
    const before = Number(u.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
    const data = await database().prepare(metadataSql + ' WHERE version < ? ORDER BY version DESC LIMIT 100').bind(before).all();
    return json({ history: data.results });
}
catch {
    return json({ error: 'Histórico indisponível' }, 503);
} }
