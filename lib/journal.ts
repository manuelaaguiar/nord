import { z } from 'zod';
export const runSchema = z.object({text:z.string().max(100000),bold:z.boolean().optional(),italic:z.boolean().optional(),underline:z.boolean().optional()}).strict();
export const entrySchema = z.object({
 id:z.string().uuid(), title:z.string().max(180), kind:z.enum(['diary','document']),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),font:z.enum(['sans','serif','mono']),
 paragraphs:z.array(z.array(runSchema).max(2000)).max(2000),
 attachments:z.array(z.object({id:z.string().uuid(),kind:z.enum(['image','audio']),caption:z.string().max(1000)}).strict()).max(80)
}).strict().superRefine((s,c)=>{if(s.paragraphs.reduce((n,p)=>n+p.reduce((m,r)=>m+r.text.length,0),0)>150000)c.addIssue({code:'custom',message:'Página muito longa'});if(new Set(s.attachments.map(a=>a.id)).size!==s.attachments.length)c.addIssue({code:'custom',message:'Anexos repetidos'});});
export const journalSaveSchema=z.object({baseVersion:z.number().int().nonnegative(),operationId:z.string().uuid(),entry:entrySchema}).strict();
export type JournalRow={entry_id:string;version:number;operation_id:string;created_at:string;payload:string};
export const journalSelect='SELECT j.* FROM journal_revisions j WHERE j.version=(SELECT MAX(k.version) FROM journal_revisions k WHERE k.entry_id=j.entry_id)';
export function journalResult(row:JournalRow){return {entry:JSON.parse(row.payload),version:row.version,at:row.created_at};}
