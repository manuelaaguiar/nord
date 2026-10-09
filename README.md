# NÓRD

Dashboard privado para planejar viagens longas, com estética dark minimalista, salvamento automático e histórico recuperável.

**Prioridades:** backend seguro e organizado → piloto pessoal na viagem → estrutura comercial após o retorno.

## O que já funciona

- Tarefas em quadro arrastável, com edição alternativa por botão.
- Roteiro, bagagem, orçamento, Caderno e consulta dos materiais originais.
- Salvamento no servidor com controle de versão, conflitos explícitos e repetição segura.
- Histórico de revisões, restauração sem apagar versões e exportação JSON.
- Guia básico e assistente de IA com histórico separado, limite diário e segredo somente no servidor.

O projeto ainda é um piloto de uma única pessoa. **Não tornar o site ou este repositório públicos:** a autorização das APIs depende da barreira privada do Sites, e os dados iniciais incluem materiais pessoais. Publicação para vários clientes exige autorização e isolamento próprios.

## Começar do zero

1. Use Node.js 22.13 ou superior e Git. Abra um terminal na pasta do projeto.
2. Leia `AGENTS.md`, que contém regras de preservação dos dados e manutenção.
3. Instale as dependências travadas: `npm run install:ci`.
4. Execute `npm test` e `npm run typecheck`. Esses testes não precisam de chave de IA nem acessam o banco de produção.
5. Para executar o aplicativo completo, faça o build e prepare o banco local conforme abaixo. O banco de testes em memória não substitui o banco da prévia.

```sh
npm run build
npm run check:secrets
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_equal_tony_stark.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_thin_nico_minoru.sql
npm run dev
```

Aplique cada migração apenas uma vez e em ordem; não repita esses comandos num banco local já migrado. Acesse a URL impressa pelo servidor. No perfil portátil, o login local de desenvolvimento usa `/signin-with-chatgpt?return_to=/`; isso não representa autenticação de produção. No ambiente gerenciado, use o fluxo de prévia do Sites. Mantenha prévias locais restritas a loopback.

Sem a chave de IA, o planejamento e o guia continuam disponíveis, mas a IA informa que não está conectada. Em produção, `OPENAI_API_KEY` deve existir somente no gerenciador de segredos do runtime. Não cole credenciais em arquivos versionados, no navegador, em commits ou issues.

## Estrutura

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
| `data/dashboard-html.ts` | Interface atual; futura separação em componentes |
| `data/initial.json` | Dados iniciais; não substituem o plano de produção |
| `tests/` | Regressão de persistência e assistente |

## Contrato de preservação

O banco D1 é a fonte canônica. O navegador guarda apenas rascunhos pendentes de confirmação. Cada edição envia `baseVersion`, `operationId`, `label` e o estado completo. Reutilize um identificador apenas para repetir exatamente a mesma edição. Uma resposta 409 exige releitura e reconciliação: nunca force sobrescrita.

As revisões do plano são acrescentadas. Materiais originais omitidos são mantidos; alterá-los pela rota de plano é rejeitado. Acrescente observações no Caderno. Exportação e restauração precisam de ensaio periódico; não há promessa absoluta contra perda. Não apague o armazenamento do navegador enquanto houver rascunhos pendentes.

## IA e custos

Modelo fixado em `lib/assistant.ts`: `gpt-5.6-luna`, sem raciocínio adicional, até 700 tokens de saída e 30 consultas por dia no fuso de Fortaleza. A API tem cobrança própria. Não há upgrade automático nem busca web. O assistente recebe contexto limitado e três interações recentes; não recebe os documentos originais ou o Caderno integral, e não altera a viagem. O limite diário inclui tentativas admitidas que falharam.

## Validar e publicar

```sh
npm test
npm run typecheck
npm run build
npm run check:secrets
```

No Sites, use o fluxo oficial de abrir o projeto existente, construir, enviar o commit exato, empacotar e publicar a versão privada. Não crie outro site. Não altere migrações já aplicadas. Uma cópia no GitHub não configura sincronização ou publicação automática.

Testes usam SQLite local e respostas de IA simuladas: validam o contrato, mas não substituem testes em dispositivos reais ou auditoria de segurança. O scanner de segredos usa padrões e, se disponível, comparação com uma chave local; sua aprovação não prova ausência de todo segredo.

## Evolução e segurança

- Agora: estabilizar backend, ensaiar recuperação, verificar rede instável e conflitos entre dispositivos.
- Na viagem: observar o uso pessoal e registrar dificuldades concretas no único documento vivo do projeto.
- Depois: validar público e demanda; implementar autorização por usuário, isolamento dos dados, retenção/exclusão, observabilidade, suporte e cobrança antes da abertura comercial.

Codex Security: conexão e análise ainda pendentes de confirmação. Não há auditoria externa concluída.

O README explica o código. Decisões, revisões periódicas e próximos passos ficam no documento único **NORD-Projeto-Vivo.docx**, sem criar relatórios paralelos.
