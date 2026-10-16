#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy automático SIS-ELECTRODOMESTICOS (Docker + ghcr.io)
#   • appmg.arletgroup.com        → backend API + frontend Vite
#   • megaelectra.arletgroup.com  → catálogo Next.js 16 (SSR)
#
# Las imágenes de backend/frontend/catalogo se construyen en GitHub Actions
# y se publican en ghcr.io. Este script NUNCA construye nada: solo hace
# pull de la imagen del commit actual y levanta los contenedores.
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
IMAGE_SOURCE_FILTER="label=org.opencontainers.image.source=https://github.com/felipe4563/SIS-ELECTRODOMESTICOS"
PULL_RETRY_INTERVAL=30
PULL_RETRY_MAX_MINUTES=15

# ── Confirma que la imagen de cada servicio para $TAG existe localmente ───────
# (docker compose pull puede devolver éxito sin haber descargado nada nuevo
# cuando el servicio también tiene `build:` definido — algunas versiones de
# Compose solo advierten en vez de fallar. Esto verifica el estado real.)
images_present() {
  local services=("$@")
  local service
  for service in "${services[@]}"; do
    docker image inspect "ghcr.io/felipe4563/sis-electrodomesticos-${service}:${TAG}" >/dev/null 2>&1 || return 1
  done
  return 0
}

# ── Espera reintentando hasta que ghcr.io tenga las imágenes del commit actual ─
wait_for_images() {
  local services=("$@")
  local max_attempts=$(( PULL_RETRY_MAX_MINUTES * 60 / PULL_RETRY_INTERVAL ))
  local attempt=1

  while true; do
    if docker compose pull "${services[@]}" && images_present "${services[@]}"; then
      return 0
    fi

    if (( attempt >= max_attempts )); then
      return 1
    fi

    warn "No se pudieron descargar todas las imágenes (intento $attempt/$max_attempts). Reintentando en ${PULL_RETRY_INTERVAL}s..."
    sleep "$PULL_RETRY_INTERVAL"
    attempt=$(( attempt + 1 ))
  done
}

# ── Borra imágenes viejas de ESTE proyecto, nunca las que están en uso ─────────
prune_old_images() {
  local label_filter="$1"
  local keep_image_ids candidates

  # docker images (sin --no-trunc) y docker compose images -q truncan el ID
  # de forma distinta — se normalizan ambos a 12 caracteres para comparar.
  keep_image_ids=$(docker compose images -q 2>/dev/null | cut -c1-12 || true)
  candidates=$(docker images --filter "$label_filter" --format '{{.ID}} {{.Repository}}:{{.Tag}}' 2>/dev/null || true)

  [[ -z "$candidates" ]] && return 0

  while IFS=' ' read -r image_id image_ref; do
    [[ -z "$image_id" ]] && continue
    if ! grep -q "^${image_id:0:12}$" <<< "$keep_image_ids"; then
      log "Eliminando imagen vieja: $image_ref ($image_id)"
      docker rmi "$image_id" 2>/dev/null || warn "No se pudo eliminar $image_ref (en uso)"
    fi
  done <<< "$candidates"
}

main() {
  echo -e "\n${BOLD}╔══════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}║   DEPLOY — appmg + megaelectra.arletgroup ║${RESET}"
  echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
  log "Directorio: $APP_DIR"
  log "Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"

  # ── 1. Prerrequisitos ───────────────────────────────────────────────────────
  step "Verificando prerrequisitos"

  command -v docker        >/dev/null 2>&1 || error "docker no encontrado"
  command -v git           >/dev/null 2>&1 || error "git no encontrado"
  docker compose version   >/dev/null 2>&1 || error "docker compose no encontrado (v2 requerido)"

  ok "Docker:         $(docker --version)"
  ok "Docker Compose: $(docker compose version)"

  [[ -f "$APP_DIR/.env" ]] || error "Falta $APP_DIR/.env — copia .env.example y complétalo"

  cd "$APP_DIR"

  # ── 2. Git pull ─────────────────────────────────────────────────────────────
  if [[ "$SKIP_PULL" == false ]]; then
    step "Actualizando código (git pull)"

    if [[ -n "$(git status --porcelain)" ]]; then
      error "Hay cambios locales sin commitear en $APP_DIR (incluye archivos sin trackear). Commiteá o descartalos antes de desplegar."
    fi

    git fetch origin "$BRANCH"
    COMMITS_BEHIND=$(git rev-list HEAD..origin/$BRANCH --count)

    if [[ "$COMMITS_BEHIND" -eq 0 ]]; then
      ok "Ya está en la última versión (rama $BRANCH)"
    else
      log "$COMMITS_BEHIND commit(s) nuevos. Aplicando..."
      git pull --ff-only origin "$BRANCH"
      ok "Código actualizado"
    fi

    log "Commit actual: $(git log -1 --format='%h %s (%ar)')"
  else
    warn "Omitiendo git pull (--skip-pull)"
  fi

  TAG="$(git rev-parse HEAD)"
  export TAG
  log "TAG de imagen: $TAG"

  # Persistir TAG en .env: si alguien corre `docker compose up -d` a mano
  # sin pasar por este script, que use la última imagen desplegada en vez
  # de caer sorpresivamente a :latest (que puede no estar ni descargada).
  if grep -q '^TAG=' "$APP_DIR/.env" 2>/dev/null; then
    sed -i "s/^TAG=.*/TAG=${TAG}/" "$APP_DIR/.env"
  else
    echo "TAG=${TAG}" >> "$APP_DIR/.env"
  fi

  # ── 3. Base de datos (siempre levantada antes de los servicios) ─────────────
  step "Base de datos"
  docker compose up -d db
  ok "Contenedor db levantado"

  # ── 4. Pull + up de servicios (nunca build) ──────────────────────────────────
  SERVICES=()
  [[ "$SKIP_BACKEND"  == false ]] && SERVICES+=("backend")
  [[ "$SKIP_FRONTEND" == false ]] && SERVICES+=("frontend")
  [[ "$SKIP_CATALOGO" == false ]] && SERVICES+=("catalogo")

  if [[ ${#SERVICES[@]} -gt 0 ]]; then
    step "Descargando imágenes: ${SERVICES[*]}"

    if wait_for_images "${SERVICES[@]}"; then
      ok "Imágenes descargadas: ${SERVICES[*]}"
    else
      error "No aparecieron todas las imágenes para el commit $TAG después de ${PULL_RETRY_MAX_MINUTES} minutos. Producción sigue con la versión anterior. Revisá https://github.com/felipe4563/SIS-ELECTRODOMESTICOS/actions"
    fi

    step "Levantando: ${SERVICES[*]}"
    docker compose up -d --no-build --remove-orphans "${SERVICES[@]}"
    ok "Servicios levantados: ${SERVICES[*]}"
  else
    warn "Todos los servicios omitidos con --skip-*"
  fi

  # Asegurar que backup esté corriendo (sin rebuild)
  docker compose up -d backup 2>/dev/null || warn "Servicio backup no disponible (¿clonaste agentele_backups en backup/?)"

  # ── 5. Limpiar imágenes viejas de este proyecto ──────────────────────────────
  step "Limpiando imágenes Docker viejas de este proyecto"
  prune_old_images "$IMAGE_SOURCE_FILTER"
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
  echo -e "  Sistema   → https://appmg.arletgroup.com"
  echo -e "  Catálogo  → https://megaelectra.arletgroup.com"
  echo -e ""
  echo -e "  Ver logs  → docker compose logs -f backend"
  echo -e "  Estado    → docker compose ps"
  echo -e ""

  docker compose ps
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
