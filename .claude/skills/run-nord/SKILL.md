---
name: run-nord
description: Run, check, test and verify the NÓRD repository locally — the same guard, gitleaks, actionlint and npm test/typecheck/build steps as CI. Use when asked to run NÓRD, run its checks or tests, verify a change before pushing, or confirm no secrets or personal data are committed.
---

O NÓRD é verificado por `.claude/skills/run-nord/check.sh`: um espelho local da CI (`.github/workflows/ci.yml`). Rode-o antes de todo push.

Caminhos relativos à raiz do repositório.

O código v16 está na raiz (`package.json` presente). O script instala dependências e roda testes, tipos, lint, build e varredura de segredos. Publicação continua no OpenAI Sites, não neste script.

## Pré-requisitos

Node 22 (`.nvmrc`), Corepack/pnpm 11.25.0, `git`, `curl`. Na primeira execução, o script baixa o gitleaks 8.18.4 e o actionlint 1.7.1 (as mesmas versões da CI) para `~/.cache/nord-tools/<ferramenta>-<versão>/`. Mudar a versão no script força um novo download.

## Rodar (caminho do agente)

```bash
bash .claude/skills/run-nord/check.sh
```

Qualquer `FALHOU` faz o script sair com 1 e mostra as últimas 20 linhas da ferramenta que falhou.

| verificação | o que pega |
|---|---|
| guarda (`scripts/guard-repo.mjs`) | `.env*`, `.dev.vars`, `.wrangler/`, `data/initial.json` (dados pessoais), `*.nord.json`, cópias de banco e chaves rastreados pelo git |
| gitleaks (histórico) | segredos em commits já feitos |
| gitleaks (staged) | segredos em arquivos adicionados (`git add`) e ainda não commitados |
| actionlint | erros no workflow da CI |
| npm | `install:ci`, `test`, `typecheck`, `lint`, `build`, `check:secrets` |

Para só instalar dependências neste container, sem o instalador do Sites:

```bash
NORD_SIMPLE_INSTALL=1 npm run install:ci
```

## Pegadinhas

- **`gitleaks detect` não vê arquivos preparados para commit.** Um token `ghp_…` adicionado com `git add` passou pelo `detect` (exit 0) e só o `protect --staged` o pegou (exit 1). Por isso o script roda os dois. A CI roda só o `detect`, que basta lá porque o PR já contém commits.
- **A guarda e o gitleaks são complementares.** O gitleaks julga o *conteúdo*: um `.env` preparado para commit com uma chave fictícia no formato `OPENAI_API_KEY=sk-proj-…` foi pego pelo `protect --staged`, mas não pelo `detect`. A guarda barra pelo *nome*: `data/initial.json` com dados pessoais não tem cara de segredo, e só ela o impede. Mantenha os dois.
- **`hashFiles()` não é permitido no `if:` de nível de job** no GitHub Actions; o workflow inteiro fica inválido. O actionlint acusa o erro (`calling function "hashFiles" is not allowed here`). Use um passo que grave um output e condicione os passos.
- O script testa a árvore que você está vendo. Arquivos não rastreados (`??`) não passam pela guarda: o que importa é o que o git vai enviar.

## Solução de problemas

- **`FALHOU: download gitleaks` / `download actionlint`:** sem acesso de rede ao github.com. Copie os binários manualmente para `~/.cache/nord-tools/gitleaks-8.18.4/gitleaks` e `~/.cache/nord-tools/actionlint-1.7.1/actionlint`.
- **`gitleaks (staged) ... FALHOU` / `leaks found: 1` depois de editar documentação:** um exemplo de chave escrito por inteiro no texto conta como vazamento. Escreva exemplos truncados (`sk-proj-…`). O `--verbose` mostra o arquivo e a linha, com o segredo mascarado.
- **`guard:repo — arquivos proibidos rastreados pelo git: • .env …`:** `git rm --cached <arquivo>` e confira o `.gitignore`. Se já foi enviado ao GitHub, trate como vazamento (`SECURITY.md`).
