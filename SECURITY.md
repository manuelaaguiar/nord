# Segurança

O NÓRD é um piloto pessoal privado. Não há programa público de recompensa.

## Relatar uma vulnerabilidade

Não abra issue pública. Use o relatório privado do GitHub (**Security → Report a vulnerability**) neste repositório. Inclua passos para reproduzir e o impacto esperado. **Não** inclua dados pessoais, exportações do plano ou chaves.

## Escopo atual

- A demonstração pública é fail-closed: `lib/demo-boundary.ts` nega APIs, mutações e dados privados. Identidade ou credencial de serviço não atravessam a barreira.
- Ainda não existe autorização própria por usuário. Mudar a audiência do Sites não cria autenticação no app.
- `OPENAI_API_KEY` fica somente no gerenciador de segredos do runtime.
- Nenhuma auditoria externa foi concluída.

## Se um segredo vazar

1. Revogue a chave imediatamente no provedor e gere outra no gerenciador de segredos do runtime.
2. Remova o arquivo do git e confira se o push protection bloqueou o envio.
3. Registre o incidente no documento vivo (sem colar o segredo).
