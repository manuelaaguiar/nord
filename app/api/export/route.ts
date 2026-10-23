import { database, latest, type Revision } from '../../../lib/store';
import { json } from '../../../lib/travel';
export async function GET() { try {
    const row = await latest();
    if (!row)
        return json({ error: 'Viagem ainda não inicializada' }, 404);
    const max = row.version, db = database(), encoder = new TextEncoder();
    const stream = new ReadableStream({ async start(controller) { try {
            controller.enqueue(encoder.encode('{"format":"nord-backup-v1","exportedAt":' + JSON.stringify(new Date().toISOString()) + ',"current":' + row.payload + ',"history":['));
            let after = 0, first = true;
            while (after < max) {
                const page = await db.prepare('SELECT * FROM revisions WHERE version>? AND version<=? ORDER BY version LIMIT 20').bind(after, max).all<Revision>();
                if (!page.results.length)
                    break;
                for (const rev of page.results) {
                    controller.enqueue(encoder.encode((first ? '' : ',') + JSON.stringify({ id: rev.operation_id, version: rev.version, at: rev.created_at, label: rev.label, actor: rev.actor, state: JSON.parse(rev.payload) })));
                    first = false;
                    after = rev.version;
                }
            }
            controller.enqueue(encoder.encode('],"assistantMessages":['));
            let offset = 0, chatFirst = true;
            while (true) {
                const chats = await db.prepare('SELECT id,created_at AS at,question,answer,status,model,state_version AS stateVersion FROM assistant_messages ORDER BY created_at,id LIMIT 20 OFFSET ?').bind(offset).all();
                for (const chat of chats.results) {
                    controller.enqueue(encoder.encode((chatFirst ? '' : ',') + JSON.stringify(chat)));
                    chatFirst = false;
                }
                if (chats.results.length < 20)
                    break;
                offset += chats.results.length;
            }
            controller.enqueue(encoder.encode('],"journalRevisions":['));
            let journalAfter=0,journalFirst=true;
            const bound=await db.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM journal_revisions').first<{n:number}>();
            while(journalAfter<(bound?.n||0)){
                const rows=await db.prepare('SELECT rowid AS cursor,entry_id AS entryId,version,created_at AS at,payload FROM journal_revisions WHERE rowid>? AND rowid<=? ORDER BY rowid LIMIT 20').bind(journalAfter,bound!.n).all<{cursor:number;entryId:string;version:number;at:string;payload:string}>();
                if(!rows.results.length)break;
                for(const item of rows.results){controller.enqueue(encoder.encode((journalFirst?'':',')+JSON.stringify({entryId:item.entryId,version:item.version,at:item.at,entry:JSON.parse(item.payload)})));journalFirst=false;journalAfter=item.cursor;}
            }
            controller.enqueue(encoder.encode('],"journalMediaNote":"Anexos binários permanecem no caderno privado. Exporte cada documento HTML para incluir imagens e áudios em uma cópia independente."}'));
            controller.close();
        }
        catch (e) {
            controller.error(e);
        } } });
    return new Response(stream, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="nord-viagem-backup.json"', 'Cache-Control': 'no-store' } });
}
catch {
    return json({ error: 'Exportação indisponível' }, 503);
} }
