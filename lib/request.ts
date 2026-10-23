/** Enforce byte limits before parsing, including chunked requests. */
export class RequestError extends Error {
    constructor(message: string, public status: number) { super(message); }
}
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
    const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json')
        throw new RequestError('JSON obrigatório.', 415);
    const length = request.headers.get('content-length');
    if (length && Number(length) > maxBytes)
        throw new RequestError('Conteúdo muito grande.', 413);
    const reader = request.body?.getReader();
    if (!reader)
        throw new RequestError('JSON inválido.', 400);
    const decoder = new TextDecoder();
    let size = 0, text = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > maxBytes) {
                await reader.cancel();
                throw new RequestError('Conteúdo muito grande.', 413);
            }
            text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
        try {
            return JSON.parse(text);
        }
        catch {
            throw new RequestError('JSON inválido.', 400);
        }
    }
    finally {
        reader.releaseLock();
    }
}
