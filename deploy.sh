#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy automático SIS-ELECTRODOMESTICOS
#   • megaelectra.rusoft.dev   → backend API + frontend Vite
#   • bubbasvibes.rusoft.dev   → catálogo Next.js 16 (SSR)
#
# Uso:  bash deploy.sh [--skip-pull] [--skip-frontend] [--skip-backend] [--skip-catalogo]
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
APP_DIR="$(cd "$(dirname "$0")" && pwd)"   # /home/ubuntu/SISTEMAS/SIS-ELECTRODOMESTICOS
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
CATALOGO_DIR="$APP_DIR/catalogo"
FRONTEND_DIST="$FRONTEND_DIR/dist"        # Nginx sirve directamente
PM2_API_NAME="electrodomesticos-api"      # proceso PM2 del backend
PM2_CAT_NAME="bubbasvibes-catalogo"       # proceso PM2 del catálogo Next.js
BACKEND_PORT=3001
CATALOGO_PORT=5174
BRANCH="main"
# ─────────────────────────────────────────────────────────────────────────────

echo -e "\n${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   DEPLOY — megaelectra + bubbasvibes      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
log "Directorio: $APP_DIR"
log "Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"
log "API:        $PM2_API_NAME (puerto $BACKEND_PORT)"
log "Catálogo:   $PM2_CAT_NAME (puerto $CATALOGO_PORT)"

# ── 1. Verificar prerrequisitos ───────────────────────────────────────────────
step "Verificando prerrequisitos"

command -v node  >/dev/null 2>&1 || error "node no encontrado. Instala Node.js >= 18"
command -v npm   >/dev/null 2>&1 || error "npm no encontrado"
command -v git   >/dev/null 2>&1 || error "git no encontrado"
command -v pm2   >/dev/null 2>&1 || error "pm2 no encontrado. Instala con: npm i -g pm2"

ok "Node: $(node -v)"
ok "npm:  $(npm -v)"
ok "pm2:  $(pm2 -v)"

[[ -f "$BACKEND_DIR/.env" ]]  || error "Falta $BACKEND_DIR/.env — créalo con las variables de BD y JWT"
[[ -f "$FRONTEND_DIR/.env" ]] || warn  "Falta $FRONTEND_DIR/.env — VITE_API_URL puede no estar configurado"
[[ -f "$CATALOGO_DIR/.env.local" ]] || warn "Falta $CATALOGO_DIR/.env.local — variables del catálogo no configuradas"

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

# ── 3. Backend — dependencias + restart PM2 ───────────────────────────────────
if [[ "$SKIP_BACKEND" == false ]]; then
  step "Backend — instalando dependencias"
  cd "$BACKEND_DIR"

  npm install --omit=dev --no-audit --no-fund
  ok "Dependencias backend instaladas"

  step "Backend — reiniciando con PM2"
  if pm2 show "$PM2_API_NAME" > /dev/null 2>&1; then
    pm2 reload "$PM2_API_NAME" --update-env
    ok "Proceso '$PM2_API_NAME' recargado"
  else
    if [[ -f "$BACKEND_DIR/ecosystem.config.js" ]]; then
      pm2 start "$BACKEND_DIR/ecosystem.config.js" --env production
    else
      pm2 start "$BACKEND_DIR/index.js" --name "$PM2_API_NAME"
    fi
    pm2 save
    ok "Proceso '$PM2_API_NAME' iniciado y guardado en PM2"
  fi
else
  warn "Omitiendo backend (--skip-backend)"
fi

# ── 4. Frontend — build Vite (nginx lo sirve directamente) ───────────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  step "Frontend — instalando dependencias"
  cd "$FRONTEND_DIR"

  npm install --no-audit --no-fund
  ok "Dependencias frontend instaladas"

  step "Frontend — construyendo (vite build)"
  npm run build
  ok "Build generado en $FRONTEND_DIST"
  ok "Nginx sirve el nuevo build automáticamente"
else
  warn "Omitiendo frontend (--skip-frontend)"
fi

# ── 5. Catálogo Next.js — build + restart PM2 ────────────────────────────────
if [[ "$SKIP_CATALOGO" == false ]]; then
  step "Catálogo — instalando dependencias"
  cd "$CATALOGO_DIR"

  npm install --no-audit --no-fund
  ok "Dependencias catálogo instaladas"

  step "Catálogo — construyendo (next build)"
  npm run build
  ok "Build del catálogo generado"

  step "Catálogo — reiniciando con PM2"
  if pm2 show "$PM2_CAT_NAME" > /dev/null 2>&1; then
    pm2 reload "$PM2_CAT_NAME" --update-env
    ok "Proceso '$PM2_CAT_NAME' recargado"
  else
    # next start -p 5174  (definido en package.json como "start")
    pm2 start npm --name "$PM2_CAT_NAME" -- start
    pm2 save
    ok "Proceso '$PM2_CAT_NAME' iniciado y guardado en PM2"
  fi
else
  warn "Omitiendo catálogo (--skip-catalogo)"
fi

# ── 6. Health checks ──────────────────────────────────────────────────────────
step "Health checks"
sleep 3  # tiempo para que PM2 levante los procesos

if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT/api/health"
elif curl -sf "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
  ok "Backend responde en :$BACKEND_PORT"
else
  warn "Backend no responde en :$BACKEND_PORT — revisa logs:"
  warn "  pm2 logs $PM2_API_NAME --lines 30"
fi

if curl -sf "http://localhost:$CATALOGO_PORT" >/dev/null 2>&1; then
  ok "Catálogo responde en :$CATALOGO_PORT"
else
  warn "Catálogo no responde en :$CATALOGO_PORT — revisa logs:"
  warn "  pm2 logs $PM2_CAT_NAME --lines 30"
fi

# ── Resumen final ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}══ Deploy completado ══${RESET}"
echo -e "  Sistema   → https://megaelectra.rusoft.dev"
echo -e "  Catálogo  → https://bubbasvibes.rusoft.dev"
echo -e ""
echo -e "  API logs  → pm2 logs $PM2_API_NAME"
echo -e "  Cat logs  → pm2 logs $PM2_CAT_NAME"
echo -e "  Monit     → pm2 monit"
echo -e ""

pm2 list
