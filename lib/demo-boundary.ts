/** Public demo has no data principal. Neither a browser identity header nor a
 * dispatch service credential grants access to the preserved private backend.
 * This is deliberately fail-closed until a separate owner ACL is verified. */
const DENIAL = {
  mode: 'demonstration',
  error: 'Os dados privados, anexos e a API de IA não estão disponíveis nesta área pública. O planejamento do visitante é local.',
} as const;

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'",
  'Referrer-Policy': 'no-referrer',
} as const;

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'microphone=(), camera=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
} as const;

const notFoundHtml = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>NÓRD · Página não encontrada</title><meta name="description" content="Este endereço não existe no NÓRD. Volte ao início para explorar destinos."><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/nord/typography.css?v=roles1"><link rel="stylesheet" href="/nord/global.css?v=1"></head><body><a class="skip-link" href="#view">Ir ao conteúdo</a><header class="rail"><a class="logo" href="/dashboard#explore" aria-label="NÓRD, início">NÓR<em>D</em></a></header><main id="view" tabindex="-1"><section class="view-heading"><p class="eyebrow">404 · CAMINHO LIVRE</p><h1>Esta página<br>não existe.</h1><p>O endereço que você abriu não faz parte do NÓRD. Seus registros neste navegador não foram alterados.</p></section><div class="empty-actions"><a class="text-link" href="/dashboard#explore">Voltar para explorar →</a></div></main><footer class="site-footer"><div><strong>NÓRD</strong><span>Amplie seus horizontes.</span></div><p>Registros salvos somente neste navegador. Sem sincronização ou backup automático.</p></footer></body></html>`;

function jsonDenial(): Response {
  return Response.json(DENIAL, { status: 403, headers: JSON_HEADERS });
}

function htmlNotFound(head: boolean): Response {
  return new Response(head ? null : notFoundHtml, { status: 404, headers: HTML_HEADERS });
}

function isPublicRead(path: string): boolean {
  return path === '/' || path === '/dashboard' || path === '/dashboard/'
    || path === '/favicon.svg'
    || /^\/nord\/[a-zA-Z0-9_./-]+$/.test(path)
    || path.startsWith('/assets/');
}

function isApiPath(path: string): boolean {
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { /* keep raw path */ }
  const lower = `${path}\n${decoded}`.toLowerCase();
  return /(?:^|\/)api(?:\/|$)/.test(lower.replace(/\\/g, '/'));
}

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return /text\/html/i.test(accept);
}

export function demoBoundary(request: Request): Response | null {
  const path = new URL(request.url).pathname;
  const read = request.method === 'GET' || request.method === 'HEAD';
  if (read && isPublicRead(path)) return null;
  if (read && wantsHtml(request) && !isApiPath(path)) return htmlNotFound(request.method === 'HEAD');
  return jsonDenial();
}
