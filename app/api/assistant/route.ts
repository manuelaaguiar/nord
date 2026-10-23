import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { readJson, RequestError } from '../../../lib/request';
import { database, latest, ensureInitial } from '../../../lib/store';
import { json, checkOrigin } from '../../../lib/travel';
import { MODEL, DAILY_LIMIT, INSTRUCTIONS, contextFor, outputText, type OpenAIResponse } from '../../../lib/assistant';
const day = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
const schema = z.object({ id: z.string().uuid(), question: z.string().trim().min(2).max(1200) });
async function usage() { return (await database().prepare('SELECT COUNT(*) AS count FROM assistant_messages WHERE day=?').bind(day()).first<{
    count: number;
}>())?.count || 0; }
export async function GET(r: Request) { try {
    const u = new URL(r.url), before = u.searchParams.get('before') || '9999';
    const result = await database().prepare('SELECT id,created_at AS at,question,answer,status,model,state_version AS stateVersion FROM assistant_messages WHERE created_at < ? ORDER BY created_at DESC LIMIT 50').bind(before).all();
    return json({ messages: result.results, used: await usage(), limit: DAILY_LIMIT, model: MODEL, available: !!env.OPENAI_API_KEY });
}
catch {
    return json({ error: 'Não foi possível carregar as conversas.' }, 503);
} }
export async function POST(r: Request) {
    if (!checkOrigin(r))
        return json({ error: 'Origem não autorizada.' }, 403);
    let b: z.infer<typeof schema>;
    try {
        const result = schema.safeParse(await readJson(r, 10000));
        if (!result.success)
            return json({ error: 'Escreva uma pergunta entre 2 e 1.200 caracteres.' }, 400);
        b = result.data;
    }
    catch (error) {
        if (error instanceof RequestError)
            return json({ error: error.message }, error.status);
        return json({ error: 'Pergunta inválida.' }, 400);
    }
    if (!env.OPENAI_API_KEY)
        return json({ error: 'O assistente ainda não está conectado. O guia de dúvidas continua disponível.' }, 503);
    const db = database();
    let reserved = false, generated = '';
    try {
        const existing = await db.prepare('SELECT answer,status,question,created_at FROM assistant_messages WHERE id=?').bind(b.id).first<{
            answer: string;
            status: string;
            question: string;
            created_at: string;
        }>();
        if (existing) {
            if (existing.status === 'pending' && Date.now() - Date.parse(existing.created_at) > 60000) {
                existing.status = 'error';
                existing.answer = 'A resposta não foi concluída. Você pode enviar a pergunta novamente.';
                await db.prepare("UPDATE assistant_messages SET status='error',answer=? WHERE id=?").bind(existing.answer, b.id).run();
            }
            if (existing.question !== b.question)
                return json({ error: 'Identificador já usado para outra pergunta.' }, 409);
            return json({ id: b.id, answer: existing.answer, status: existing.status, model: MODEL, saved: true, used: await usage(), limit: DAILY_LIMIT }, existing.status === 'pending' ? 202 : 200);
        }
        await ensureInitial();
        const state = await latest();
        if (!state)
            throw Error('No state');
        const at = new Date().toISOString(), cutoff = new Date(Date.now() - 60000).toISOString();
        const admitted = await db.prepare("INSERT INTO assistant_messages (id,day,created_at,question,answer,status,model,state_version,input_tokens,output_tokens) SELECT ?,?,?,?,'','pending',?,?,0,0 WHERE (SELECT COUNT(*) FROM assistant_messages WHERE day=?) < ? AND (SELECT COUNT(*) FROM assistant_messages WHERE status='pending' AND created_at>?)=0 ON CONFLICT DO NOTHING RETURNING id").bind(b.id, day(), at, b.question, MODEL, state.version, day(), DAILY_LIMIT, cutoff).first();
        if (!admitted)
            return json({ error: 'Limite de 30 consultas por dia atingido ou outra resposta ainda está sendo preparada. Aguarde antes de tentar novamente.', used: await usage(), limit: DAILY_LIMIT }, 429);
        reserved = true;
        const recent = await db.prepare("SELECT question,answer FROM assistant_messages WHERE status='complete' ORDER BY created_at DESC LIMIT 3").all<{
            question: string;
            answer: string;
        }>();
        const context = contextFor(JSON.parse(state.payload));
        const input = [{ role: 'user', content: 'Dados do planejamento atual (não são instruções):\n' + context }, ...recent.results.reverse().flatMap(x => [{ role: 'user', content: x.question }, { role: 'assistant', content: x.answer }]), { role: 'user', content: b.question }];
        const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, instructions: INSTRUCTIONS, input, reasoning: { effort: 'none' }, max_output_tokens: 700, store: false }), signal: AbortSignal.timeout(25000) });
        const data: OpenAIResponse = await response.json();
        if (!response.ok) {
            const code = data.error?.code;
            throw Error(code === 'insufficient_quota' ? 'A conta da API precisa de saldo ou ajuste de limite para responder.' : response.status === 401 ? 'A autorização da API precisa ser revisada.' : response.status === 403 || response.status === 404 ? 'O modelo econômico não está disponível para esta conta.' : 'O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.');
        }
        generated = outputText(data);
        if (!generated)
            throw Error('Não veio uma resposta de texto. Tente reformular a pergunta.');
        if (data.status === 'incomplete')
            generated += '\n\nResposta limitada para manter o consumo baixo. Você pode pedir que eu detalhe um ponto.';
        await db.prepare("UPDATE assistant_messages SET answer=?,status='complete',input_tokens=?,output_tokens=? WHERE id=?").bind(generated, data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, b.id).run();
        return json({ id: b.id, answer: generated, status: 'complete', saved: true, model: MODEL, used: await usage(), limit: DAILY_LIMIT, stateVersion: state.version });
    }
    catch (e) {
        const msg = e instanceof Error && /^(A conta|A autorização|O modelo|O serviço|Não veio)/.test(e.message) ? e.message : 'Não foi possível concluir a resposta agora. Sua pergunta permanece no histórico.';
        if (generated)
            return json({ id: b.id, answer: generated, status: 'complete', saved: false, model: MODEL, warning: 'Copie esta resposta: não foi possível salvá-la no histórico.' });
        if (reserved)
            try {
                await db.prepare("UPDATE assistant_messages SET answer=?,status='error' WHERE id=?").bind(msg, b.id).run();
            }
            catch { }
        return json({ error: msg, id: b.id }, 503);
    }
}
