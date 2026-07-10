#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy automático SIS-ELECTRODOMESTICOS (megaelectra.rusoft.dev)
# Uso:  bash deploy.sh [--skip-pull] [--skip-frontend] [--skip-backend]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
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

for arg in "$@"; do
  case $arg in
    --skip-pull)     SKIP_PULL=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    --skip-backend)  SKIP_BACKEND=true ;;
    *) warn "Argumento desconocido: $arg" ;;
  esac
done

# ── Configuración ─────────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "$0")" && pwd)"   # /home/ubuntu/SISTEMAS/SIS-ELECTRODOMESTICOS
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_DIST="$FRONTEND_DIR/dist"         # Nginx apunta aquí directamente
PM2_APP_NAME="megaelectra-api"             # Nombre exacto del proceso PM2
BACKEND_PORT=3001                          # Puerto del backend (nginx proxy_pass :3001)
BRANCH="main"
# ─────────────────────────────────────────────────────────────────────────────

echo -e "\n${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   DEPLOY — megaelectra.rusoft.dev         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
log "Directorio: $APP_DIR"
log "Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"
log "Proceso:    $PM2_APP_NAME (puerto $BACKEND_PORT)"

# ── 1. Verificar prerrequisitos ───────────────────────────────────────────────
step "Verificando prerrequisitos"

command -v node  >/dev/null 2>&1 || error "node no encontrado. Instala Node.js >= 18"
command -v npm   >/dev/null 2>&1 || error "npm no encontrado"
command -v git   >/dev/null 2>&1 || error "git no encontrado"
command -v pm2   >/dev/null 2>&1 || error "pm2 no encontrado. Instala con: npm i -g pm2"

ok "Node: $(node -v)"
ok "npm:  $(npm -v)"
ok "pm2:  $(pm2 -v)"

# Verificar que existen los .env necesarios
[[ -f "$BACKEND_DIR/.env" ]] || error "Falta $BACKEND_DIR/.env — créalo con las variables de BD y JWT"
[[ -f "$FRONTEND_DIR/.env" ]] || warn "Falta $FRONTEND_DIR/.env — VITE_API_URL puede no estar configurado"

# ── 2. Git pull ───────────────────────────────────────────────────────────────
if [[ "$SKIP_PULL" == false ]]; then
  step "Actualizando código (git pull)"
  cd "$APP_DIR"

  # Guardar cambios locales si los hay (por ej. archivos .env editados en el server)
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

# ── 3. Backend — dependencias + restart PM2 ───────────────────────────────────
if [[ "$SKIP_BACKEND" == false ]]; then
  step "Backend — instalando dependencias"
  cd "$BACKEND_DIR"

  npm install --omit=dev --no-audit --no-fund
  ok "Dependencias backend instaladas"

  step "Backend — reiniciando con PM2"
  if pm2 show "$PM2_APP_NAME" > /dev/null 2>&1; then
    pm2 reload "$PM2_APP_NAME" --update-env
    ok "Proceso '$PM2_APP_NAME' recargado"
  else
    # Primera vez o si el proceso fue eliminado
    if [[ -f "$BACKEND_DIR/ecosystem.config.js" ]]; then
      pm2 start "$BACKEND_DIR/ecosystem.config.js" --env production
    else
      pm2 start "$BACKEND_DIR/index.js" --name "$PM2_APP_NAME"
    fi
    pm2 save
    ok "Proceso '$PM2_APP_NAME' iniciado y guardado en PM2"
  fi
else
  warn "Omitiendo backend (--skip-backend)"
fi

# ── 4. Frontend — build en dist/ (nginx lo sirve directamente) ───────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  step "Frontend — instalando dependencias"
  cd "$FRONTEND_DIR"

  npm install --no-audit --no-fund
  ok "Dependencias frontend instaladas"

  step "Frontend — construyendo (vite build)"
  npm run build
  ok "Build generado en $FRONTEND_DIST"
  ok "Nginx sirve el nuevo build automáticamente (sin necesidad de copiar archivos)"
else
  warn "Omitiendo frontend (--skip-frontend)"
fi

# ── 5. Health check ───────────────────────────────────────────────────────────
step "Health check"
sleep 2  # Tiempo para que PM2 levante el proceso

if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT/api/health"
elif curl -sf "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT"
else
  warn "Backend no responde en :$BACKEND_PORT — revisa los logs:"
  warn "  pm2 logs $PM2_APP_NAME --lines 30"
fi

# ── Resumen final ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}══ Deploy completado ══${RESET}"
echo -e "  Sitio    → https://megaelectra.rusoft.dev"
echo -e "  Backend  → pm2 reload $PM2_APP_NAME"
echo -e "  Logs     → pm2 logs $PM2_APP_NAME"
echo -e "  Monit    → pm2 monit\n"

pm2 list
