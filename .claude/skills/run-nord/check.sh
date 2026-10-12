#!/usr/bin/env bash
# Local mirror of .github/workflows/ci.yml for NÓRD. Run from anywhere inside the repo.
#   bash .claude/skills/run-nord/check.sh
# Exit 0 only if every check passes. Tools are downloaded once (pinned) to ~/.cache/nord-tools.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

GITLEAKS_VERSION=8.18.4   # keep in sync with ci.yml
ACTIONLINT_VERSION=1.7.1
TOOLS="${XDG_CACHE_HOME:-$HOME/.cache}/nord-tools"
# One directory per version, so bumping a version above never reuses a stale binary.
GITLEAKS="$TOOLS/gitleaks-$GITLEAKS_VERSION/gitleaks"
ACTIONLINT="$TOOLS/actionlint-$ACTIONLINT_VERSION/actionlint"

fetch() { # binary-path url
  [ -x "$1" ] && return 0
  mkdir -p "$(dirname "$1")"
  curl -sSfL "$2" | tar -xz -C "$(dirname "$1")" "$(basename "$1")"
}
fetch "$GITLEAKS" "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" || { echo "FALHOU: download gitleaks"; exit 1; }
fetch "$ACTIONLINT" "https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz" || { echo "FALHOU: download actionlint"; exit 1; }

failed=0
run() { # label cmd...
  printf '• %s ... ' "$1"; shift
  if out=$("$@" 2>&1); then echo ok; else echo FALHOU; echo "$out" | tail -20; failed=1; fi
}

run "guarda do repositório" node scripts/guard-repo.mjs
run "gitleaks (histórico)" "$GITLEAKS" detect --source . --redact --verbose --exit-code 1 --no-banner
# detect only reads commits; staged-but-uncommitted files need protect --staged.
run "gitleaks (staged)" "$GITLEAKS" protect --staged --redact --verbose --exit-code 1 --no-banner
run "actionlint" "$ACTIONLINT" .github/workflows/*.yml

if [ -f package.json ]; then
  run "npm run install:ci" npm run install:ci
  run "npm test" npm test
  run "npm run typecheck" npm run typecheck
  run "npm run build" npm run build
  run "npm run check:secrets" npm run check:secrets
else
  echo "• app: package.json ausente — código do Sites ainda não importado; testes/tipos/build ignorados"
fi

[ $failed = 0 ] && echo OK || echo FALHOU
exit $failed
