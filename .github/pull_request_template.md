## O que muda

<!-- Uma ou duas frases. -->

## Por quê

<!-- Problema, item R1–R8 ou atrito do piloto que motivou a mudança. -->

## Dados e preservação

- [ ] Não altera migrações já aplicadas (novas migrações são aditivas)
- [ ] Não substitui o plano de produção pelos dados iniciais
- [ ] Mantém `baseVersion` / `operationId` / 409 sem sobrescrita forçada
- [ ] Não versiona segredos, `data/initial.json` nem exportações

## Verificação

- [ ] `node scripts/guard-repo.mjs`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build` + `npm run check:secrets`
- [ ] Teste manual (dispositivo, conexão, resultado):

## Publicação

- [ ] Não precisa publicar
- [ ] Publicar no Sites após o merge e registrar o commit no documento vivo
