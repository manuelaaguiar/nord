import {database} from '../../../lib/store';
import {json,checkOrigin} from '../../../lib/travel';
import {RequestError} from '../../../lib/request';
import {bucket,readBytes,mediaType,MAX_STORAGE} from '../../../lib/media';
const validId=(s:string|null)=>!!s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
type Media={id:string;mime:string;kind:string;size:number;digest:string;status:string};
export async function POST(r:Request){if(!checkOrigin(r))return json({error:'Origem não autorizada'},403);const id=new URL(r.url).searchParams.get('id');if(!validId(id))return json({error:'Identificador inválido'},400);try{
 const bytes=await readBytes(r),type=mediaType(bytes,(r.headers.get('content-type')||'').split(';')[0]),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');const db=database();
 let old=await db.prepare('SELECT * FROM journal_media WHERE id=?').bind(id).first<Media>();
 if(!old){await db.prepare("INSERT INTO journal_media (id,mime,kind,size,digest,status,created_at) SELECT ?,?,?,?,?,'pending',? WHERE (SELECT COALESCE(SUM(size),0) FROM journal_media)+?<=? ON CONFLICT DO NOTHING").bind(id,type.mime,type.kind,bytes.length,digest,new Date().toISOString(),bytes.length,MAX_STORAGE).run();old=await db.prepare('SELECT * FROM journal_media WHERE id=?').bind(id).first<Media>();}
 if(!old)return json({error:'O caderno atingiu 500 MB de anexos. Seu arquivo continua neste dispositivo.'},413);
 if(old.digest!==digest||old.mime!==type.mime)return json({error:'Identificador já usado para outro arquivo.'},409);
 if(old.status!=='ready'){await bucket().put('journal/'+id,bytes,{httpMetadata:{contentType:type.mime}});await db.prepare("UPDATE journal_media SET status='ready' WHERE id=?").bind(id).run();}
 return json({id,mime:type.mime,kind:type.kind,size:bytes.length,saved:true});
 }catch(e){if(e instanceof RequestError)return json({error:e.message},e.status);console.error('journal-media-save-failed');return json({error:'O anexo não foi confirmado. Seu arquivo permanece no rascunho; tente novamente.'},503);}}
export async function GET(r:Request){const id=new URL(r.url).searchParams.get('id');if(!validId(id))return json({error:'Arquivo inválido'},400);try{
 const media=await database().prepare("SELECT * FROM journal_media WHERE id=? AND status='ready'").bind(id).first<Media>();if(!media)return json({error:'Arquivo não encontrado'},404);
 const range=r.headers.get('range');const object=await bucket().get('journal/'+id,{range:r.headers});if(!object)return json({error:'Arquivo indisponível'},404);
 const headers=new Headers({'Content-Type':media.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Accept-Ranges':'bytes','Content-Disposition':'inline'});
 let status=200;if(range&&object.range&&'offset' in object.range){const start=object.range.offset??0,length=object.range.length??media.size;headers.set('Content-Range',`bytes ${start}-${start+length-1}/${media.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(media.size));
 return new Response(object.body,{status,headers});
 }catch{return json({error:'Não foi possível abrir o arquivo'},503);}}
