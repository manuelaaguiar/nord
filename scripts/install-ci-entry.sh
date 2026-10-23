#!/usr/bin/env bash
# GitHub Actions, check.sh e máquinas sem runtime do Sites: Corepack + lockfile.
# OpenAI Sites (SITES_* presente): instalador pnpm gerenciado.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${SITES_PNPM_BIN:-}" || -n "${SITES_RUNTIME_ROOT:-}" || "${SITES_ENV_READY:-}" == "1" ]]; then
  if [[ -n "${GITHUB_ACTIONS:-}" || "${NORD_SIMPLE_INSTALL:-}" == "1" ]]; then
    :
  else
    exec bash "${script_dir}/install-pnpm.sh" "$@"
  fi
fi

command -v corepack >/dev/null || { echo "install:ci exige Corepack (Node 22)." >&2; exit 69; }
corepack enable
corepack prepare pnpm@11.25.0 --activate
exec pnpm install --frozen-lockfile
