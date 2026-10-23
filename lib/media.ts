import {env} from 'cloudflare:workers';
import {RequestError} from './request';
export const MAX_MEDIA=20*1024*1024,MAX_STORAGE=500*1024*1024;
export function bucket(){if(!env.BUCKET)throw Error('Media storage unavailable');return env.BUCKET;}
export async function readBytes(r:Request){const size=Number(r.headers.get('content-length'));if(size>MAX_MEDIA)throw new RequestError('Limite de 20 MB por arquivo.',413);const reader=r.body?.getReader();if(!reader)throw new RequestError('Arquivo vazio.',400);let length=0;const parts:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_MEDIA){await reader.cancel();throw new RequestError('Limite de 20 MB por arquivo.',413);}parts.push(value);}const out=new Uint8Array(length);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}finally{reader.releaseLock();}}
export function mediaType(bytes:Uint8Array,declared:string){const s=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(bytes.length<12)throw new RequestError('Arquivo vazio ou não reconhecido.',415);
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',kind:'image'};
 if(s(1,4)==='PNG'&&bytes[0]===137&&bytes[4]===13&&bytes[5]===10)return {mime:'image/png',kind:'image'};
 if(s(0,4)==='RIFF'&&s(8,12)==='WEBP')return {mime:'image/webp',kind:'image'};
 if(s(0,4)==='RIFF'&&s(8,12)==='WAVE')return {mime:'audio/wav',kind:'audio'};
 if(s(0,4)==='OggS')return {mime:'audio/ogg',kind:'audio'};
 if(bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163&&declared.startsWith('audio/webm'))return {mime:'audio/webm',kind:'audio'};
 if(s(4,8)==='ftyp'&&['audio/mp4','audio/x-m4a'].includes(declared))return {mime:'audio/mp4',kind:'audio'};
 if(s(0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224))return {mime:'audio/mpeg',kind:'audio'};
 throw new RequestError('Use imagens JPG, PNG ou WebP; áudio MP3, WAV, OGG, WebM ou M4A. HEIC pode ser convertido para JPG.',415);
}
