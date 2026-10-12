# NÓRD

Dashboard privado para planejar viagens longas, com estética dark minimalista, salvamento automático e histórico recuperável.

> **Status:** piloto pessoal privado (viagem Madrid–Islândia, 25/10 → 04/11/2026).
> **Não tornar o site nem este repositório públicos.** A autorização das APIs ainda depende da barreira privada do ChatGPT Sites; não há autenticação própria por usuário.

**Ordem de prioridades:** backend seguro e organizado → piloto pessoal na viagem → estrutura comercial após o retorno.

Decisões, revisões e próximos passos ficam no documento único **NORD-Projeto-Vivo.docx**. Este README explica o código e o processo de manutenção; não cria relatórios paralelos.

---

## Sumário

1. [Começar do zero](#começar-do-zero)
2. [Arquitetura](#arquitetura)
3. [Contrato de preservação de dados](#contrato-de-preservação-de-dados)
4. [Segurança e segredos](#segurança-e-segredos)
5. [IA e custos](#ia-e-custos)
6. [Fluxo de contribuição e CI](#fluxo-de-contribuição-e-ci)
7. [Publicar e reverter](#publicar-e-reverter)
8. [Recuperação de dados (ensaio)](#recuperação-de-dados-ensaio)
9. [Robustez do piloto (R1–R8)](#robustez-do-piloto-r1r8)
10. [Prontidão comercial](#prontidão-comercial)

---

## O que já funciona

- Tarefas em quadro arrastável, com edição alternativa por botão.
- Roteiro, bagagem, orçamento, Caderno e consulta dos materiais originais.
- Salvamento no servidor com controle de versão, conflitos explícitos e repetição segura.
- Histórico de revisões, restauração sem apagar versões e exportação JSON.
- Guia básico e assistente de IA com histórico separado, limite diário e segredo somente no servidor.

## Começar do zero

Requisitos: **Node.js 22.13+** (ver `.nvmrc`) e Git.

1. Leia `AGENTS.md` — regras de preservação dos dados e manutenção.
2. Instale as dependências travadas: `npm run install:ci`.
3. Rode `npm test` e `npm run typecheck`. Os testes não precisam de chave de IA nem acessam o banco de produção.
4. Para o app completo, faça o build e prepare o banco local:

```sh
npm run build
npm run check:secrets
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_equal_tony_stark.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_thin_nico_minoru.sql
npm run dev
```

Aplique cada migração **uma única vez e em ordem**; não repita num banco local já migrado. Acesse a URL impressa pelo servidor e mantenha prévias locais restritas a loopback.

- Login local de desenvolvimento (perfil portátil): `/signin-with-chatgpt?return_to=/`. **Não** representa autenticação de produção.
- Sem `OPENAI_API_KEY`, planejamento e guia funcionam; a IA informa que não está conectada.

### Dados iniciais

`data/initial.json` **não é versionado** porque contém materiais pessoais. Ele é carregado apenas no ambiente da viagem. Para desenvolvimento, use uma viagem fictícia (`data/initial.example.json`, a criar a partir do esquema em `lib/travel.ts`). O guarda do repositório (`node scripts/guard-repo.mjs`, ver abaixo) bloqueia o envio do arquivo real.

## Arquitetura

| Caminho | Função |
| --- | --- |
| `app/api/state/` | Ler e salvar versões do plano |
| `app/api/history/` | Consultar revisões |
| `app/api/export/` | Exportar plano, histórico e conversas |
| `app/api/assistant/` | Conversas e chamadas de IA no servidor |
| `lib/request.ts` | Leitura de JSON com limite em bytes |
| `lib/travel.ts` | Esquemas e validação dos dados |
| `lib/store.ts` | Acesso ao banco e inicialização |
| `lib/assistant.ts` | Modelo, instruções e contexto limitado |
| `db/` e `drizzle/` | Esquema e migrações incrementais |
| `data/dashboard-html.ts` | Interface atual (separação em componentes: Fase 3) |
| `tests/` | Regressão de persistência e assistente |
| `scripts/guard-repo.mjs` | Bloqueia arquivos proibidos no git (segredos, dados pessoais, estado local) |
| `.github/` | CI, Dependabot, CODEOWNERS e modelo de PR |

### Fluxo de salvamento

```
Navegador (rascunho pendente)
   │  envia { baseVersion, operationId, label, state }
   ▼
app/api/state ──► lib/request.ts (limite em bytes) ──► lib/travel.ts (validação)
   │
   ▼
lib/store.ts ── baseVersion == versão atual? ──┬── sim ─► acrescenta revisão (D1) ─► 200 { version }
                                                ├── mesmo operationId + mesmo conteúdo ─► 200 (repetição segura)
                                                └── não ─► 409 conflito ─► cliente relê e reconcilia
```

## Contrato de preservação de dados

- O banco **D1 é a fonte canônica**. O navegador guarda apenas rascunhos pendentes de confirmação.
- Cada edição envia `baseVersion`, `operationId`, `label` e o estado completo.
- Reutilize um `operationId` **apenas** para repetir exatamente a mesma edição; conteúdo diferente com o mesmo identificador é rejeitado.
- Uma resposta **409** exige releitura e reconciliação. **Nunca force sobrescrita.**
- Revisões são **acrescentadas**, nunca reescritas. Restaurar cria uma nova revisão.
- Materiais originais omitidos por cliente antigo são mantidos; tentar alterá-los pela rota de plano é rejeitado. Complementos vão para o Caderno.
- Publicar código **não** pode substituir o plano de produção pelos dados iniciais.
- Migrações são **somente aditivas**. Nunca edite uma migração já aplicada.
- Não apague o armazenamento do navegador enquanto houver rascunhos pendentes. Exporte antes.

Não há promessa absoluta contra perda: exportação e restauração precisam de ensaio periódico (ver [Recuperação](#recuperação-de-dados-ensaio)).

## Segurança e segredos

- `OPENAI_API_KEY` existe **somente** no gerenciador de segredos do runtime. Nunca em arquivos versionados, navegador, commits, issues ou no documento vivo.
- `npm run check:secrets` após cada build (padrões + comparação com chave local, se disponível). Aprovação não prova ausência de todo segredo.
- `node scripts/guard-repo.mjs` falha se o git rastrear `.env*`, `.dev.vars*`, `.wrangler/`, `data/initial.json`, exportações `*.nord.json` ou backups de banco.
- A CI roda **gitleaks** em todo o histórico em cada PR e em cada push para `main`. Push em outro branch sem PR aberto não é verificado: rode `bash .claude/skills/run-nord/check.sh` antes.
- No GitHub, mantenha ligados: repositório privado, secret scanning + push protection, Dependabot alerts, proteção do `main`.
- Vulnerabilidades: ver `SECURITY.md`.

Pendências conhecidas: autorização própria por usuário; auditoria externa (Codex Security ou equivalente ainda não executado).

## IA e custos

Modelo fixado em `lib/assistant.ts`: `gpt-5.6-luna`, sem raciocínio adicional, até 700 tokens de saída e **30 consultas por dia** (fuso de Fortaleza). O limite inclui tentativas admitidas que falharam.

- A API tem cobrança própria. Não há upgrade automático nem busca web.
- O assistente recebe contexto limitado e três interações recentes; não recebe documentos originais nem o Caderno integral, e **não altera a viagem**.
- Mudança de modelo exige PR dedicado com estimativa de custo.

## Fluxo de contribuição e CI

1. Crie um branch a partir de `main`. Nunca envie direto para `main`.
2. Antes do PR, rode localmente:

```sh
node scripts/guard-repo.mjs
npm test
npm run typecheck
npm run build
npm run check:secrets
```

3. Abra o PR usando o modelo (`.github/pull_request_template.md`). A CI (`.github/workflows/ci.yml`) roda os mesmos passos em Node 22 + gitleaks; falha bloqueia o merge.
4. Mudanças em `drizzle/`, `lib/store.ts` ou nas rotas `app/api/` exigem teste de regressão novo ou atualizado.

**Congelamento do piloto:** de 22/10 a 04/11/2026, só entram correções de falha de salvamento ou de bloqueio de uso.

## Publicar e reverter

O GitHub **não** publica automaticamente; ele é a cópia versionada e o lugar da CI.

- Publicação: no ChatGPT Sites, use o fluxo oficial de abrir o projeto existente, construir, enviar o commit exato, empacotar e publicar a versão privada. Não crie outro site.
- Registre no documento vivo o commit publicado e a data.
- Cada versão publicada recebe uma tag (`v0.1-pilot`, `v0.1.1`, …).
- **Reverter:** publique no Sites o commit da tag anterior. Código revertido não reverte dados: o banco D1 continua com as revisões acrescentadas.

## Recuperação de dados (ensaio)

Faça antes da viagem e depois mensalmente. Nunca contra o banco de produção.

1. Exporte o plano completo pelo app (plano + histórico + conversas). Guarde em **dois** locais fora do app.
2. Em um banco local limpo (`.wrangler/state` novo), aplique todas as migrações em ordem.
3. Importe/restaure a exportação no banco local.
4. Compare: nº de revisões, versão atual e o estado da última revisão (hash do JSON normalizado) com a exportação.
5. Registre no documento vivo: data, resultado, divergências.

Critério de sucesso: estado e contagem de revisões idênticos, sem passos manuais não documentados.

## Robustez do piloto (R1–R8)

Cada item fecha com evidência (teste verde ou registro), não com opinião.

| # | Item | Evidência |
| --- | --- | --- |
| R1 | Ensaio exportação → restauração | Registro do ensaio acima sem perda |
| R2 | Rede instável: timeout, 5xx, resposta perdida após commit; retry com mesmo `operationId` não duplica | Testes de idempotência |
| R3 | Conflito entre dois dispositivos na mesma `baseVersion` → 409 + reconciliação sem perda | Teste + roteiro manual celular/computador |
| R4 | Limites de entrada por rota (bytes, Caderno, nº de revisões) com 413 claro | Testes de borda |
| R5 | Originais imutáveis (cliente antigo e tentativa de substituição) | Teste de regressão |
| R6 | Logs estruturados sem conteúdo do plano (rota, status, duração, `operationId`) | Revisão de código |
| R7 | Custo de IA: limite diário, teto global, desligamento por variável de ambiente | Teste do limite |
| R8 | Cabeçalhos de segurança: CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS | Verificação na prévia |

Teste manual antes de 21/10: celular e computador × toque e teclado × online, offline e conflito.

## Prontidão comercial

Só começa após o retorno (04/11), com piloto estável, recuperação comprovada e **decisão de Manuela** sobre público e proposta de valor. Nenhuma receita ou demanda é presumida.

Bloqueadores obrigatórios antes do primeiro cliente:

- [ ] Hospedagem: confirmar se o Sites permite SaaS multiusuário; caso contrário, Cloudflare Workers + D1 direto.
- [ ] Autenticação própria (login, recuperação de conta, sessões revogáveis).
- [ ] Isolamento por usuário em todas as tabelas (migração aditiva) + testes de isolamento entre contas.
- [ ] Migração do piloto para a primeira conta, com ensaio R1 antes.
- [ ] Backups automáticos e ensaio mensal de restauração.
- [ ] LGPD (e GDPR se houver usuários na UE): privacidade, termos, retenção e exclusão real de conta.
- [ ] IA: aviso de provedor externo, consentimento, cota por usuário, teto global de custo.
- [ ] Rate limiting, code scanning e pentest externo sem achados críticos.
- [ ] Observabilidade sem dados pessoais; suporte e página de status.
- [ ] Interface em componentes, onboarding e modelos de viagem genéricos (sem dados pessoais).
- [ ] Cobrança (Stripe e/ou Pix) definida após validação com piloto pago pequeno.

## Testes: o que cobrem e o que não cobrem

Os testes usam SQLite local e respostas de IA simuladas: validam o contrato, mas **não** substituem testes em dispositivos reais nem auditoria de segurança.
