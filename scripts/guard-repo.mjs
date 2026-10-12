#!/usr/bin/env node
// Falha se o git rastrear arquivos que nunca devem ser versionados:
// segredos, dados pessoais da viagem, estado local do banco e exportações.
import { execFileSync } from "node:child_process";

const forbidden = [
  { pattern: /(^|\/)\.env(\..*)?$/, reason: "arquivo de ambiente (segredos)" },
  { pattern: /(^|\/)\.dev\.vars(\..*)?$/, reason: "variáveis locais do wrangler (segredos)" },
  { pattern: /(^|\/)\.wrangler\//, reason: "estado local do banco" },
  { pattern: /^data\/initial\.json$/, reason: "dados iniciais pessoais" },
  { pattern: /\.nord\.json$/i, reason: "exportação do plano" },
  { pattern: /\.(sqlite|sqlite3|db)$/i, reason: "cópia de banco" },
  { pattern: /\.(pem|key|p12)$/i, reason: "chave privada" },
];

const allowed = [/\.env\.example$/];

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const violations = [];
for (const file of tracked) {
  if (allowed.some((p) => p.test(file))) continue;
  const hit = forbidden.find(({ pattern }) => pattern.test(file));
  if (hit) violations.push(`${file} — ${hit.reason}`);
}

if (violations.length > 0) {
  console.error("guard:repo — arquivos proibidos rastreados pelo git:");
  for (const v of violations) console.error(`  • ${v}`);
  console.error("Remova com `git rm --cached <arquivo>` e confira o .gitignore.");
  process.exit(1);
}

console.log(`guard:repo — ok (${tracked.length} arquivos verificados)`);
