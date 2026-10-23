# NÓRD

Experiência pública de planejamento de viagens (pt-BR), com estética dark minimalista. Visitantes exploram destinos, montam um plano no navegador e guardam um caderno local. A API privada, anexos e a IA permanecem bloqueados.

> **Status:** demonstração pública no ChatGPT Sites / OpenAI Sites (`https://yournordclub.com/dashboard`).
> Este repositório é a cópia versionada do código **v16**. A publicação **não** sai automaticamente do GitHub: o host atual continua sendo o projeto Sites existente (`.openai/hosting.json`).

**Ordem de prioridades:** fronteira pública segura → piloto pessoal na viagem → estrutura comercial após o retorno.

Decisões de produto e próximos passos ficam no documento vivo `legacy/NORD-Projeto-Vivo.docx`. Este README explica o código e o processo de manutenção.

---

## Sumário

1. [Começar do zero](#começar-do-zero)
2. [Arquitetura](#arquitetura)
3. [Fronteira pública](#fronteira-pública)
4. [Contrato de preservação de dados](#contrato-de-preservação-de-dados)
5. [Segurança e segredos](#segurança-e-segredos)
6. [IA e custos](#ia-e-custos)
7. [Fluxo de contribuição e CI](#fluxo-de-contribuição-e-ci)
8. [Publicar e reverter](#publicar-e-reverter)
9. [Recuperação de dados (ensaio)](#recuperação-de-dados-ensaio)
10. [Robustez do piloto (R1–R8)](#robustez-do-piloto-r1r8)
11. [Prontidão comercial](#prontidão-comercial)

---

## Começar do zero

Requisitos: **Node.js 22.13+** (ver `.nvmrc`), **pnpm 11.25.0** (Corepack) e Git.

1. Leia `AGENTS.md` — regras da demonstração pública e da preservação dos dados.
2. Instale as dependências travadas: `pnpm install --frozen-lockfile` (ou `NORD_SIMPLE_INSTALL=1 npm run install:ci`).
3. Rode `npm test`, `npm run typecheck` e `npm run lint`. Os testes não precisam de chave de IA nem acessam o banco de produção.
4. Para o app completo:

```sh
npm run build
npm run check:secrets
npm run dev
```

A prévia local usa a porta 5173. Após o build, `npm start` sobe o Worker em loopback. Sem `OPENAI_API_KEY`, o planejamento e os guias funcionam; a Luna informa que não está conectada.

O seed sintético versionado é `data/initial.example.json` (conteúdo fictício). `data/initial.json` **não é versionado**: a guarda do repositório bloqueia o arquivo real, que só deve existir no ambiente do piloto.

### Artefatos antigos

Os ZIPs v15 foram removidos da raiz: já estavam no histórico do Git e o código vigente é o v16 descompactado. O documento vivo e um capturado antigo de tela ficam em `legacy/`.

---

## Arquitetura

A interface pública é HTML estático servido em `/dashboard`, com scripts em `public/nord/`. O Worker (`build/sites-worker.ts`) aplica `lib/demo-boundary.ts` **antes** de qualquer rota do framework.

| Caminho | Função |
| --- | --- |
| `app/dashboard/` | Página pública (CSP `script-src 'self'`) |
| `app/api/state/` | Ler e salvar versões do plano (bloqueado em público) |
| `app/api/history/` | Consultar revisões (bloqueado) |
| `app/api/export/` | Exportar plano, histórico e conversas (bloqueado) |
| `app/api/assistant/` | Conversas e IA no servidor (bloqueado) |
| `lib/demo-boundary.ts` | Permite só apresentação pública; 404 HTML para navegação; 403 JSON para API |
| `lib/travel.ts` | Esquemas e validação dos dados |
| `lib/store.ts` | Acesso ao banco e inicialização privada |
| `public/nord/visitor.js` | Experiência local no navegador |
| `public/nord/startup.js` | Arranque externo (sem script inline) |
| `tests/` | Persistência, assistente, demo pública, 404/CSP/datas |
| `scripts/guard-repo.mjs` | Bloqueia arquivos proibidos no git |
| `.github/` | CI, Dependabot, CODEOWNERS e modelo de PR |

Tipografia: Play (títulos), Cousine (dados), Cormorant Garamond (editorial), DM Sans / fontes de sistema (corpo). Licenças OFL em `public/nord/design/fonts/`.

---

## Fronteira pública

`lib/demo-boundary.ts` permite leitura de `/`, `/dashboard` e assets `/nord/*`. Qualquer API, mutação ou rota desconhecida é negada.

- Pedidos de dados e mutações (e GET sem `Accept: text/html`) recebem **403 JSON** `{mode:"demonstration",...}`.
- Navegação de browser (`GET`/`HEAD` com `Accept: text/html`) para caminho não-API desconhecido recebe **404 HTML** em pt-BR, com volta para `/dashboard#explore`.
- Cabeçalhos de identidade ou credencial de serviço **não** atravessam a barreira.
- Cotações públicas saem só para `open.er-api.com` e `api.coingecko.com`, sem credenciais e sem dados da viagem.

Não há autenticação própria. O backend D1/R2 do piloto permanece no host e **não** entra neste repositório.

---

## Contrato de preservação de dados

- No modo público, a fonte canônica do visitante é o **localStorage deste navegador** (`nord.visitor-trip.v1.personal`), separado do exemplo. Não há sync nem backup automático.
- O banco **D1** continua sendo a fonte canônica do plano privado da proprietária. Publicar código **não** pode substituir o plano de produção pelos dados iniciais.
- Cada edição privada envia `baseVersion`, `operationId`, `label` e o estado completo. Reutilize um `operationId` **apenas** para repetir a mesma edição.
- Uma resposta **409** exige releitura e reconciliação. **Nunca force sobrescrita.**
- Revisões são **acrescentadas**. Restaurar cria uma nova revisão.
- Migrações são **somente aditivas**. Nunca edite uma migração já aplicada.
- Não apague o armazenamento do navegador enquanto houver rascunhos pendentes. Exporte antes.

---

## Segurança e segredos

- `OPENAI_API_KEY` existe **somente** no gerenciador de segredos do runtime. Nunca em arquivos versionados, navegador, commits ou issues.
- `npm run check:secrets` após cada build. Aprovação não prova ausência de todo segredo.
- `node scripts/guard-repo.mjs` falha se o git rastrear `.env*`, `.dev.vars*`, `.wrangler/`, `data/initial.json`, exportações `*.nord.json` ou backups de banco.
- A CI roda **gitleaks** em todo o histórico em cada PR e em cada push para `main`. Antes de enviar: `bash .claude/skills/run-nord/check.sh`.
- No GitHub, mantenha: repositório privado, secret scanning + push protection, Dependabot, proteção do `main`.
- Vulnerabilidades: ver `SECURITY.md`.

Pendências conhecidas: autorização própria por usuário; auditoria externa ainda não executada.

---

## IA e custos

Modelo fixado em `lib/assistant.ts`: `gpt-5.6-luna`, sem raciocínio adicional, até 700 tokens de saída e **30 consultas por dia** (fuso de Fortaleza). A rota está inacessível na demonstração pública.

- A API tem cobrança própria. Não há upgrade automático nem busca web.
- O assistente recebe contexto limitado e três interações recentes; **não altera a viagem**.
- Mudança de modelo exige PR dedicado com estimativa de custo.

---

## Fluxo de contribuição e CI

1. Crie um branch a partir de `main`. Nunca envie direto para `main`.
2. Antes do PR, rode localmente:

```sh
bash .claude/skills/run-nord/check.sh
```

Ou, no mínimo: `node scripts/guard-repo.mjs`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:secrets`.

3. Abra o PR com o modelo (`.github/pull_request_template.md`). A CI instala, testa, faz typecheck, lint, build e varredura de segredos em Node 22.
4. Mudanças em `drizzle/`, `lib/store.ts`, `lib/demo-boundary.ts` ou nas rotas `app/api/` exigem teste de regressão novo ou atualizado.

**Congelamento do piloto:** de 22/10 a 04/11/2026, só entram correções de falha de salvamento ou de bloqueio de uso.

---

## Publicar e reverter

O GitHub **não** publica automaticamente. O host vigente é o projeto OpenAI Sites (`.openai/hosting.json`, D1 `DB`, R2 `BUCKET`).

- Publicação: no ChatGPT Sites, abra o **mesmo** projeto, construa a partir deste commit, empacote e publique a versão. Não crie outro site.
- Não rode migrações, reset ou seed em produção para testar a demo pública.
- Registre no documento vivo o commit publicado e a data.
- **Reverter:** publique no Sites o commit da tag anterior. Código revertido não reverte dados D1.

O script de desafio do Cloudflare (`__CF$cv$params`) é injetado pelo host e não faz parte deste repositório. A CSP do app permanece `script-src 'self'`; o arranque da interface está em `public/nord/startup.js`.

---

## Recuperação de dados (ensaio)

Faça antes da viagem e depois mensalmente. Nunca contra o banco de produção.

1. Exporte o plano completo pelo app (plano + histórico + conversas). Guarde em **dois** locais fora do app.
2. Em um banco local limpo, aplique todas as migrações em ordem.
3. Importe/restaure a exportação no banco local.
4. Compare nº de revisões, versão atual e o estado da última revisão.
5. Registre no documento vivo: data, resultado, divergências.

Visitantes da demo: a cópia JSON local (`nord-visitor-copy-v1`) é o único backup. Importação valida o arquivo e guarda a viagem anterior em cópias de recuperação locais.

---

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
| R8 | Cabeçalhos de segurança: CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | Verificação na prévia / testes de CSP |

---

## Prontidão comercial

Só começa após o retorno (04/11), com piloto estável, recuperação comprovada e **decisão de Manuela** sobre público e proposta de valor.

Bloqueadores obrigatórios antes do primeiro cliente: hospedagem SaaS (Sites ou Workers+D1), autenticação própria, isolamento por usuário, migração do piloto, backups, LGPD, cota de IA, rate limiting, pentest, observabilidade e cobrança.

---

## Testes: o que cobrem e o que não cobrem

Os testes usam SQLite local, DOM simulado e respostas de IA simuladas. Validam o contrato, mas **não** substituem testes em dispositivos reais nem auditoria de segurança. Não constituem teste físico em iPhone/Safari.
