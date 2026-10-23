import { z } from 'zod';
const id = z.string().min(1).max(120), short = z.string().max(1000), notes = z.string().max(100000);
const httpsUrl=z.string().url().max(3000).refine(v=>new URL(v).protocol==='https:');
const curationSource=z.object({title:short.min(1),url:httpsUrl});
export const curationSchema=z.object({updatedAt:z.string().datetime(),items:z.array(z.object({
 id,stage:z.string().max(80),category:z.string().max(80),priority:z.enum(['1','2']),kind:z.enum(['option','action','flight','information']),title:short.min(1),subtitle:short.optional(),why:z.string().max(10000),location:short,costLabel:z.string().max(2000),status:short,nextAction:z.string().max(10000),checkedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),details:z.array(z.string().max(4000)).max(40),sources:z.array(curationSource).max(20),
 image:z.object({mediaId:z.string().uuid(),caption:short,credit:short,sourceUrl:httpsUrl,licenseUrl:httpsUrl}).optional(),
 officialPhotosUrl:httpsUrl.optional()
})).max(180),warnings:z.array(z.string().max(4000)).max(40)});
export const travelSchema = z.object({ schema: z.literal(1),
    tasks: z.array(z.object({ id, title: short.min(1), notes, due: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/), priority: z.enum(['1', '2', '3']), status: z.enum(['todo', 'doing', 'done']), category: short })).max(1000),
    itinerary: z.array(z.object({ id, day: short, month: short, title: short, notes })).max(500),
    bags: z.array(z.object({ title: short, caption: short, items: z.array(z.object({ id, label: short, done: z.boolean() })).max(1000) })).max(20), notes,
    budget: z.array(z.object({ id, title: short, currency: z.enum(['EUR', 'ISK', 'BRL']), amount: z.union([z.literal(''), z.string().refine(v => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0), z.number().nonnegative()]) })).max(500),
    sources: z.array(z.object({ name: short, content: notes })).max(20).optional(),
    curation: curationSchema.optional()
}).superRefine((s, ctx) => { for (const list of [s.tasks, s.itinerary, s.budget, ...(s.curation?[s.curation.items]:[]), ...s.bags.map(b => b.items)])
    if (new Set(list.map(x => x.id)).size !== list.length)
        ctx.addIssue({ code: 'custom', message: 'IDs duplicados' }); });
export const saveSchema = z.object({ baseVersion: z.number().int().min(0), operationId: id, label: short.min(1), state: travelSchema });
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export function checkOrigin(r: Request) { const origin = r.headers.get('origin'); return !origin || origin === new URL(r.url).origin; }
