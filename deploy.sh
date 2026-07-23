#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy automático SIS-ELECTRODOMESTICOS (Docker)
#   • megaelectra.rusoft.dev   → backend API + frontend Vite
#   • bubbasvibes.rusoft.dev   → catálogo Next.js 16 (SSR)
#
# Uso:  bash deploy.sh [--skip-pull] [--skip-frontend] [--skip-backend] [--skip-catalogo]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()   { echo -e "${CYAN}[deploy]${RESET} $*"; }
ok()    { echo -e "${GREEN}[  OK  ]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[ WARN ]${RESET} $*"; }
error() { echo -e "${RED}[ERROR ]${RESET} $*" >&2; exit 1; }
step()  { echo -e "\n${BOLD}${CYAN}══ $* ${RESET}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
SKIP_PULL=false
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_CATALOGO=false

for arg in "$@"; do
  case $arg in
    --skip-pull)      SKIP_PULL=true ;;
    --skip-frontend)  SKIP_FRONTEND=true ;;
    --skip-backend)   SKIP_BACKEND=true ;;
    --skip-catalogo)  SKIP_CATALOGO=true ;;
    *) warn "Argumento desconocido: $arg" ;;
  esac
done

# ── Configuración ─────────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=3001
CATALOGO_PORT=5174
BRANCH="main"

echo -e "\n${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   DEPLOY — megaelectra + bubbasvibes      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
log "Directorio: $APP_DIR"
log "Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"

# ── 1. Prerrequisitos ─────────────────────────────────────────────────────────
step "Verificando prerrequisitos"

command -v docker        >/dev/null 2>&1 || error "docker no encontrado"
command -v git           >/dev/null 2>&1 || error "git no encontrado"
docker compose version   >/dev/null 2>&1 || error "docker compose no encontrado (v2 requerido)"

ok "Docker:         $(docker --version)"
ok "Docker Compose: $(docker compose version)"

[[ -f "$APP_DIR/.env" ]] || error "Falta $APP_DIR/.env — copia .env.example y complétalo"

# ── 2. Git pull ───────────────────────────────────────────────────────────────
if [[ "$SKIP_PULL" == false ]]; then
  step "Actualizando código (git pull)"
  cd "$APP_DIR"

  if ! git diff --quiet || ! git diff --cached --quiet; then
    warn "Hay cambios locales sin commitear. Guardando con stash..."
    git stash push -m "deploy-$(date +%Y%m%d-%H%M%S)"
  fi

  git fetch origin "$BRANCH"
  COMMITS_BEHIND=$(git rev-list HEAD..origin/$BRANCH --count)

  if [[ "$COMMITS_BEHIND" -eq 0 ]]; then
    ok "Ya está en la última versión (rama $BRANCH)"
  else
    log "$COMMITS_BEHIND commit(s) nuevos. Aplicando..."
    git pull origin "$BRANCH"
    ok "Código actualizado"
  fi

  log "Commit actual: $(git log -1 --format='%h %s (%ar)')"
else
  warn "Omitiendo git pull (--skip-pull)"
fi

cd "$APP_DIR"

# ── 3. Base de datos (siempre levantada antes de los servicios) ───────────────
step "Base de datos"
docker compose up -d db
ok "Contenedor db levantado"

# ── 4. Rebuild y restart de servicios ────────────────────────────────────────
SERVICES=()
[[ "$SKIP_BACKEND"  == false ]] && SERVICES+=("backend")
[[ "$SKIP_FRONTEND" == false ]] && SERVICES+=("frontend")
[[ "$SKIP_CATALOGO" == false ]] && SERVICES+=("catalogo")

if [[ ${#SERVICES[@]} -gt 0 ]]; then
  step "Rebuilding: ${SERVICES[*]}"
  docker compose up -d --build "${SERVICES[@]}"
  ok "Servicios reconstruidos y levantados: ${SERVICES[*]}"
else
  warn "Todos los servicios omitidos con --skip-*"
fi

# Asegurar que backup esté corriendo (sin rebuild)
docker compose up -d backup 2>/dev/null || warn "Servicio backup no disponible (¿clonaste agentele_backups en backup/?)"

# ── 5. Limpiar imágenes viejas ────────────────────────────────────────────────
step "Limpiando imágenes Docker huérfanas"
docker image prune -f
ok "Limpieza completada"

# ── 6. Health checks ──────────────────────────────────────────────────────────
step "Health checks"
sleep 5

if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT/api/health"
elif curl -sf "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT"
else
  warn "Backend no responde aún en :$BACKEND_PORT"
  warn "  docker compose logs --tail=30 backend"
fi

if curl -sf "http://localhost:$CATALOGO_PORT" >/dev/null 2>&1; then
  ok "Catálogo responde en :$CATALOGO_PORT"
else
  warn "Catálogo no responde aún en :$CATALOGO_PORT"
  warn "  docker compose logs --tail=30 catalogo"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}══ Deploy completado ══${RESET}"
echo -e "  Sistema   → https://megaelectra.rusoft.dev"
echo -e "  Catálogo  → https://bubbasvibes.rusoft.dev"
echo -e ""
echo -e "  Ver logs  → docker compose logs -f backend"
echo -e "  Estado    → docker compose ps"
echo -e ""

docker compose ps
