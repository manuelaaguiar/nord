# NÓRD v16 · executar e preservar

Protótipo público com exploração global, globo e busca, entrevista de perfil e sugestões determinísticas de roteiro e kanban. Sugestões não são IA nem reservas. A viagem pessoal e o exemplo são separados. Edições, diário e recuperação usam armazenamento local do navegador.

## Limites importantes

Não há login ou isolamento por conta. Pessoas com acesso ao mesmo perfil de navegador podem ler registros locais. Não há sincronização entre dispositivos nem backup automático. Limpeza do navegador, modo privado e perda do aparelho podem apagar dados. Há exportação JSON manual e importação validada com cópia local anterior; o fluxo de importação possui testes automatizados, mas sua validação em navegador real ainda está pendente nesta entrega.

Luna/IA, anexos e áudio de visitantes continuam desativados. Todas as APIs privadas permanecem bloqueadas pelo Worker. As cotações usam apenas endpoints públicos fixos e sem credenciais, sem enviar dados da viagem/perfil; são indicativas e podem estar indisponíveis ou desatualizadas. Guias e comparações têm fontes, data e escopo, sem garantia de admissão ou notícia em tempo real.

Este ZIP não contém registros locais de visitantes, dados privados da proprietária, banco, uploads, credenciais ou histórico Git. Não é backup dos dados D1/R2 originais. Não remova a fronteira de segurança nem execute migrações, resets ou seeds em produção para testar.

## Requisitos e comandos

Node.js 22.13 ou superior e pnpm 11.25.0, conforme package.json. A instalação exige acesso ao registro oficial npm.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm check:secrets
pnpm dev
```

A prévia portátil usa a porta 5173. Após compilar, `pnpm start` executa o Worker local. Confira a proteção das APIs no Worker compilado; a prévia inclui mocks de desenvolvimento. `.env.example` contém apenas opções não secretas. Não é necessária chave de IA para este protótipo.

`.openai/hosting.json` preserva o identificador do projeto existente e nomes de bindings, sem credenciais. Não publique automaticamente noutro destino. Os dados privados D1/R2 permanecem fora deste ZIP.

## Assets e integridade

Fontes locais incluem licenças OFL, componentes vendorizados incluem avisos correspondentes e o mapa inclui proveniência Natural Earth. Luna e identidade NÓRD são preservadas do material fornecido pela proprietária; este pacote não concede nova licença de redistribuição pública. Fontes Apple são apenas referenciadas como fontes de sistema.

O snapshot deriva do commit ccc67aba1170ba9846daefcf735f6690c7e6cf4a. SOURCE-MANIFEST.json descreve os arquivos sanitizados e hashes originais; PACKAGE-MANIFEST.json descreve a entrega. Assinaturas pessoais de auditoria foram substituídas por placeholders no script de verificação de privacidade. Antes de auditar um build contra marcadores privados específicos, configure essas assinaturas privadamente; nunca as distribua. Nenhum código de aplicação foi alterado ao empacotar.

## GitHub

O envio ao GitHub privado permanece pendente. O repositório público existente não foi usado. Não envie ambientes reais, histórico Git antigo, bancos, uploads, estado Wrangler ou registros locais de visitantes.
