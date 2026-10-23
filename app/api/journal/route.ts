import {database} from '../../../lib/store';
import {json,checkOrigin} from '../../../lib/travel';
import {readJson,RequestError} from '../../../lib/request';
import {journalSaveSchema,journalSelect,journalResult,type JournalRow} from '../../../lib/journal';
export async function GET(r:Request){try{
 const u=new URL(r.url),id=u.searchParams.get('id'),v=u.searchParams.get('version');
 if(id){if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'Página inválida'},400);
 if(u.searchParams.has('history')){const data=await database().prepare('SELECT version,created_at AS at FROM journal_revisions WHERE entry_id=? ORDER BY version DESC LIMIT 100').bind(id).all();return json({history:data.results});}
 if(v&&!/^[1-9]\d*$/.test(v))return json({error:'Versão inválida'},400);
 const row=await database().prepare(v?'SELECT * FROM journal_revisions WHERE entry_id=? AND version=?':'SELECT * FROM journal_revisions WHERE entry_id=? ORDER BY version DESC LIMIT 1').bind(...(v?[id,Number(v)]:[id])).first<JournalRow>();return row?json(journalResult(row)):json({error:'Página não encontrada'},404);}
 const data=await database().prepare(journalSelect+' ORDER BY j.created_at DESC LIMIT 500').all<JournalRow>();return json({entries:data.results.map(journalResult)});
 }catch{return json({error:'Caderno indisponível. Seus rascunhos permanecem neste dispositivo.'},503);}}
export async function POST(r:Request){if(!checkOrigin(r))return json({error:'Origem não autorizada'},403);try{
 const p=journalSaveSchema.safeParse(await readJson(r,850000));if(!p.success)return json({error:'Página inválida ou muito longa. Exporte seu rascunho.'},400);
 const b=p.data,db=database(),payload=JSON.stringify(b.entry);
 const ack=(row:JournalRow)=>row.entry_id===b.entry.id&&row.version===b.baseVersion+1&&row.payload===payload?json({...journalResult(row),duplicate:true}):json({error:'Esta operação já foi usada para outra edição.'},409);
 const old=await db.prepare('SELECT * FROM journal_revisions WHERE operation_id=?').bind(b.operationId).first<JournalRow>();if(old)return ack(old);
 for(const a of b.entry.attachments){const m=await db.prepare("SELECT kind FROM journal_media WHERE id=? AND status='ready'").bind(a.id).first<{kind:string}>();if(!m||m.kind!==a.kind)return json({error:'Um anexo ainda não terminou de salvar. Aguarde ou tente novamente.'},400);}
 const at=new Date().toISOString();
 const row=await db.prepare('INSERT INTO journal_revisions (entry_id,version,operation_id,created_at,payload) SELECT ?,?,?,?,? WHERE (SELECT COALESCE(MAX(version),0) FROM journal_revisions WHERE entry_id=?)=? ON CONFLICT DO NOTHING RETURNING *').bind(b.entry.id,b.baseVersion+1,b.operationId,at,payload,b.entry.id,b.baseVersion).first<JournalRow>();
 if(row)return json(journalResult(row));
 const retry=await db.prepare('SELECT * FROM journal_revisions WHERE operation_id=?').bind(b.operationId).first<JournalRow>();if(retry)return ack(retry);
 return json({error:'Esta página mudou em outra aba ou dispositivo. Sua edição foi preservada. Salve-a como uma nova página para comparar.'},409);
 }catch(e){if(e instanceof RequestError)return json({error:e.message},e.status);console.error('journal-save-failed');return json({error:'Não foi possível salvar. Mantenha seu rascunho e tente novamente.'},503);}}
