# CI/CD con GitHub Actions + ghcr.io para el deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El VPS deja de construir imágenes Docker en cada deploy; GitHub Actions las construye y publica en ghcr.io, y el VPS solo hace `docker compose pull` + `up -d --no-build`.

**Architecture:** Un nuevo workflow de GitHub Actions (`matrix` de 3 jobs) construye `backend`, `frontend` y `catalogo` en cada push a `main` y los publica en `ghcr.io/felipe4563/sis-electrodomesticos-<servicio>` con tags `latest` + SHA completo. `docker-compose.yml` pasa a referenciar esas imágenes (`image: ghcr.io/...:${TAG:-latest}`), conservando `build:` como respaldo manual. `deploy.sh` se reescribe para nunca construir nada: hace `git pull --ff-only`, exporta `TAG` al SHA actual, espera (con reintento) a que las 3 imágenes de ese commit existan en ghcr.io, y recién ahí hace `up -d --no-build`.

**Tech Stack:** GitHub Actions (`docker/build-push-action@v6`, `docker/metadata-action@v5`, `docker/login-action@v3`, `docker/setup-buildx-action@v3`, `actions/checkout@v4`), Docker Compose v2, bash.

**Spec:** `docs/superpowers/specs/2026-10-15-cicd-ghcr-deploy-design.md`

## Global Constraints

- Imágenes construidas en CI: exactamente `backend`, `frontend`, `catalogo` — ninguna otra (`db` usa `mysql:8.0` oficial, `backup` sigue siendo un repo local aparte).
- Nombre de imagen: `ghcr.io/felipe4563/sis-electrodomesticos-<servicio>` (todo en minúsculas).
- Tags por imagen: el SHA completo del commit (`type=sha,format=long`) y `latest`. Ningún otro tag.
- Variables de build-time (`VITE_API_URL`, `NEXT_PUBLIC_API_URL`, `UPLOADS_PROXY_URL`) se leen de **GitHub Variables** (`vars.*`), nunca de Secrets — no son credenciales.
- Las 3 imágenes llevan el label `org.opencontainers.image.source=https://github.com/felipe4563/SIS-ELECTRODOMESTICOS`.
- `deploy.sh` nunca ejecuta `docker compose build` ni `up --build`; siempre `--no-build`.
- `deploy.sh` nunca hace `git stash` automático: si hay cambios sin commitear en el checkout del VPS, aborta con un mensaje claro en vez de esconderlos.
- Reintento de `docker compose pull`: cada 30 segundos, hasta 15 minutos: si ninguna combinación aparece en ese plazo, abortar sin tocar los contenedores vivos.
- Limpieza de imágenes viejas filtrada por el label `org.opencontainers.image.source` de este repo — nunca `docker image prune -f` a secas (podría borrar imágenes de otros proyectos en el mismo VPS).
- Dominios sin cambios: `appmg.arletgroup.com` (backend + frontend), `megaelectra.arletgroup.com` (catalogo).
- Flags `--skip-pull` / `--skip-frontend` / `--skip-backend` / `--skip-catalogo` se mantienen, mismo significado que hoy.
- `db` y `backup` no cambian de ninguna forma en `docker-compose.yml` ni en `deploy.sh`.

## Review Focus

- **CI todavía construyendo cuando se corre `deploy.sh`:** `docker compose pull` no encuentra la imagen del commit actual durante los primeros minutos. Comportamiento esperado: reintentar cada 30s hasta 15 min, y recién ahí abortar sin tocar los contenedores vivos — nunca un fallo inmediato ni un deploy a medias.
- **Checkout del VPS con cambios sin commitear:** correr `deploy.sh` no debe esconder esos cambios con un `stash` silencioso; debe abortar con un mensaje que diga exactamente qué hacer.
- **Imagen en uso durante la limpieza:** `prune_old_images` no debe borrar la imagen que el `docker-compose.yml` actual está usando en este momento, aunque comparta el label del proyecto.
- **VPS con imágenes de otro proyecto:** una imagen con un label `org.opencontainers.image.source` que apunte a otro repo (u otro proyecto sin ese label) nunca debe ser tocada por la limpieza.
- **`docker compose up` corrido a mano sin pasar por `deploy.sh`** (sin `TAG` exportado): `docker-compose.yml` debe caer a `:latest` por el `${TAG:-latest}`, no fallar ni quedar con una referencia de imagen vacía.

---

### Task 1: Workflow de GitHub Actions (`.github/workflows/imagenes.yml`)

**Files:**
- Create: `.github/workflows/imagenes.yml`

**Interfaces:**
- Produces: nombres de imagen `ghcr.io/felipe4563/sis-electrodomesticos-backend`, `ghcr.io/felipe4563/sis-electrodomesticos-frontend`, `ghcr.io/felipe4563/sis-electrodomesticos-catalogo`, cada una con tags `latest` y el SHA completo del commit, y el label `org.opencontainers.image.source=https://github.com/felipe4563/SIS-ELECTRODOMESTICOS` — Task 3 depende de este label exacto para su limpieza de imágenes.
- Consumes: nada de otros tasks (es el primer task, no depende de código existente más allá de los `Dockerfile` ya presentes en `backend/`, `frontend/`, `catalogo/`, que no se tocan).

- [ ] **Step 1: Crear el archivo del workflow**

Crear `.github/workflows/imagenes.yml` con este contenido exacto:

```yaml
name: Build & push images

on:
  push:
    branches: [main]

concurrency:
  group: images-${{ github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  OWNER: felipe4563

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        include:
          - service: backend
            context: ./backend
            dockerfile: ./backend/Dockerfile
            build_args: ""
          - service: frontend
            context: ./frontend
            dockerfile: ./frontend/Dockerfile
            build_args: |
              VITE_API_URL=${{ vars.VITE_API_URL }}
          - service: catalogo
            context: ./catalogo
            dockerfile: ./catalogo/Dockerfile
            build_args: |
              NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}
              UPLOADS_PROXY_URL=${{ vars.UPLOADS_PROXY_URL }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to ghcr.io
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.OWNER }}/sis-electrodomesticos-${{ matrix.service }}
          tags: |
            type=sha,format=long
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: ${{ matrix.build_args }}
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}
```

- [ ] **Step 2: Validar la sintaxis YAML**

Run: `python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/imagenes.yml')); print('YAML válido')"`
Expected: `YAML válido` (si falla, corregir la indentación — un error común en bloques `build_args: |` es mezclar tabs y espacios).

- [ ] **Step 3: Revisión estructural manual**

Confirmar leyendo el archivo que:
- Hay exactamente 3 entradas en `matrix.include` (`backend`, `frontend`, `catalogo`).
- Cada acción (`checkout`, `login-action`, `setup-buildx-action`, `metadata-action`, `build-push-action`) tiene una versión fija (`@v4`, `@v3`, `@v3`, `@v5`, `@v6`) — nunca `@main` ni sin versión.
- `tags:` en `metadata-action` incluye `type=sha,format=long` y `type=raw,value=latest` — ningún otro tag.
- `permissions.packages: write` está presente (sin esto, el push a ghcr.io falla con 403).

Esta validación estructural es manual porque `actionlint` no está instalado en esta máquina; la verificación real y definitiva ocurre en el primer push a GitHub (pestaña Actions). Si se dispone de `actionlint`, correrlo aquí y preferir su resultado.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/imagenes.yml
git commit -m "ci: build y push de backend/frontend/catalogo a ghcr.io en cada push a main"
```

---

### Task 2: `docker-compose.yml` — referenciar imágenes de ghcr.io

**Files:**
- Modify: `docker-compose.yml:24-27` (servicio `backend`)
- Modify: `docker-compose.yml:54-59` (servicio `frontend`)
- Modify: `docker-compose.yml:67-73` (servicio `catalogo`)

**Interfaces:**
- Consumes: los nombres de imagen definidos en Task 1 (`ghcr.io/felipe4563/sis-electrodomesticos-<servicio>`).
- Produces: la variable de entorno `TAG` como mecanismo para seleccionar versión — Task 3 depende de exportar `TAG` antes de invocar `docker compose`, con el mismo fallback `${TAG:-latest}` usado aquí.

- [ ] **Step 1: Agregar `image:` al servicio `backend`**

En `docker-compose.yml`, el bloque actual (líneas 24-27):

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
```

pasa a:

```yaml
  backend:
    image: ghcr.io/felipe4563/sis-electrodomesticos-backend:${TAG:-latest}
    build:
      context: ./backend
      dockerfile: Dockerfile
```

- [ ] **Step 2: Agregar `image:` al servicio `frontend`**

El bloque actual (líneas 54-59):

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
```

pasa a:

```yaml
  frontend:
    image: ghcr.io/felipe4563/sis-electrodomesticos-frontend:${TAG:-latest}
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
```

- [ ] **Step 3: Agregar `image:` al servicio `catalogo`**

El bloque actual (líneas 67-73):

```yaml
  catalogo:
    build:
      context: ./catalogo
      dockerfile: Dockerfile
      args:
        UPLOADS_PROXY_URL: ${UPLOADS_PROXY_URL}
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
```

pasa a:

```yaml
  catalogo:
    image: ghcr.io/felipe4563/sis-electrodomesticos-catalogo:${TAG:-latest}
    build:
      context: ./catalogo
      dockerfile: Dockerfile
      args:
        UPLOADS_PROXY_URL: ${UPLOADS_PROXY_URL}
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
```

`db` y `backup` quedan exactamente como están — no se tocan.

- [ ] **Step 4: Verificar que resuelve con `TAG` exportado**

Run: `TAG=test1234 docker compose config | grep "image:"`
Expected: cuatro líneas — `mysql:8.0` (db, sin cambios), `ghcr.io/felipe4563/sis-electrodomesticos-backend:test1234`, `ghcr.io/felipe4563/sis-electrodomesticos-frontend:test1234`, `ghcr.io/felipe4563/sis-electrodomesticos-catalogo:test1234`.

(Este comando no descarga ni construye nada — `docker compose config` solo resuelve e imprime la configuración final.)

- [ ] **Step 5: Verificar el fallback a `latest` sin `TAG`**

Run: `unset TAG; docker compose config | grep "image:"`
Expected: las mismas 4 líneas pero con `:latest` en vez de `:test1234` para los 3 servicios construidos — confirma el Review Focus "deploy sin pasar por `deploy.sh`" (`${TAG:-latest}` nunca debe fallar ni quedar vacío).

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: docker-compose referencia imágenes de ghcr.io con fallback a latest"
```

---

### Task 3: Reescribir `deploy.sh` para no construir nada

**Files:**
- Modify: `deploy.sh` (reescritura completa del archivo)

**Interfaces:**
- Consumes: nombres de servicio `backend`, `frontend`, `catalogo` de Task 2; variable `TAG` con el mismo fallback `${TAG:-latest}` de Task 2; label `org.opencontainers.image.source=https://github.com/felipe4563/SIS-ELECTRODOMESTICOS` de Task 1.
- Produces: funciones de bash `wait_for_images(services...)` (retorna 0 si `docker compose pull` de esos servicios tuvo éxito antes de 15 min, 1 si no) y `prune_old_images(label_filter)` (borra con `docker rmi` las imágenes que matchean `label_filter` y no están en uso actualmente por `docker compose images -q`) — nada más depende de estas funciones, pero quedan documentadas por si una iteración futura las reusa.

- [ ] **Step 1: Escribir el `deploy.sh` completo**

Reemplazar todo el contenido de `deploy.sh` por:

```bash
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

# ── Espera reintentando hasta que ghcr.io tenga las imágenes del commit actual ─
wait_for_images() {
  local services=("$@")
  local max_attempts=$(( PULL_RETRY_MAX_MINUTES * 60 / PULL_RETRY_INTERVAL ))
  local attempt=1

  while true; do
    if docker compose pull "${services[@]}"; then
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

  keep_image_ids=$(docker compose images -q 2>/dev/null || true)
  candidates=$(docker images --filter "$label_filter" --format '{{.ID}} {{.Repository}}:{{.Tag}}' 2>/dev/null || true)

  [[ -z "$candidates" ]] && return 0

  while IFS=' ' read -r image_id image_ref; do
    [[ -z "$image_id" ]] && continue
    if ! grep -q "^${image_id}$" <<< "$keep_image_ids"; then
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

    if ! git diff --quiet || ! git diff --cached --quiet; then
      error "Hay cambios locales sin commitear en $APP_DIR. Commiteá o descartalos antes de desplegar."
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

  export TAG="$(git rev-parse HEAD)"
  log "TAG de imagen: $TAG"

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
```

El guard final (`if [[ "${BASH_SOURCE[0]}" == "${0}" ]]`) permite que el próximo paso cargue las funciones con `source` sin disparar `main` — necesario para probarlas de forma aislada.

- [ ] **Step 2: Verificar la sintaxis**

Run: `bash -n deploy.sh`
Expected: sin salida, exit code 0.

- [ ] **Step 3: Probar `wait_for_images` de forma aislada (reintento + timeout)**

Crear un script de prueba temporal (NO se commitea) en el scratchpad de la sesión para verificar el Review Focus "CI todavía construyendo":

```bash
cat > /tmp/test_wait_for_images.sh <<'EOF'
#!/bin/bash
set -euo pipefail
source ./deploy.sh

# Caso A: docker compose pull falla siempre -> debe agotar reintentos y devolver 1
docker() {
  if [[ "$1 $2" == "compose pull" ]]; then
    return 1
  fi
  command docker "$@"
}
PULL_RETRY_INTERVAL=0  # acelerar la prueba, no esperar 30s reales
PULL_RETRY_MAX_MINUTES=0
# con max_minutes=0, max_attempts=0 -> fuerza el camino "agotó reintentos" en el primer intento
if wait_for_images backend frontend catalogo; then
  echo "FAIL: debía devolver 1 (timeout)"
  exit 1
fi
echo "PASS: wait_for_images agota reintentos y devuelve 1 cuando pull siempre falla"

# Caso B: docker compose pull tiene éxito al primer intento -> debe devolver 0
docker() {
  if [[ "$1 $2" == "compose pull" ]]; then
    return 0
  fi
  command docker "$@"
}
if ! wait_for_images backend frontend catalogo; then
  echo "FAIL: debía devolver 0 (éxito)"
  exit 1
fi
echo "PASS: wait_for_images devuelve 0 cuando pull tiene éxito"
EOF
bash /tmp/test_wait_for_images.sh
rm /tmp/test_wait_for_images.sh
```

Expected: ambas líneas `PASS` impresas, ningún `FAIL`.

- [ ] **Step 4: Probar `prune_old_images` de forma aislada (no borra imágenes en uso ni de otros proyectos)**

```bash
cat > /tmp/test_prune_old_images.sh <<'EOF'
#!/bin/bash
set -euo pipefail
source ./deploy.sh

RMI_CALLS=()
docker() {
  case "$1 $2" in
    "compose images")
      echo "sha256:in_use_id"
      return 0
      ;;
  esac
  if [[ "$1" == "images" ]]; then
    # Simula: una imagen vieja de este proyecto (debe borrarse),
    # la imagen en uso actual con el mismo label (NO debe borrarse),
    # y una imagen de otro proyecto con otro label (nunca aparece en este filtro)
    cat <<'IMAGES'
sha256:old_id sis-electrodomesticos-backend:abc111
sha256:in_use_id sis-electrodomesticos-backend:def222
IMAGES
    return 0
  fi
  if [[ "$1" == "rmi" ]]; then
    RMI_CALLS+=("$2")
    return 0
  fi
  command docker "$@"
}

prune_old_images "label=org.opencontainers.image.source=https://github.com/felipe4563/SIS-ELECTRODOMESTICOS"

if [[ " ${RMI_CALLS[*]} " == *" sha256:in_use_id "* ]]; then
  echo "FAIL: borró la imagen en uso"
  exit 1
fi
if [[ " ${RMI_CALLS[*]} " != *" sha256:old_id "* ]]; then
  echo "FAIL: no borró la imagen vieja que sí debía borrar"
  exit 1
fi
echo "PASS: prune_old_images borra solo la imagen vieja, nunca la que está en uso"
EOF
bash /tmp/test_prune_old_images.sh
rm /tmp/test_prune_old_images.sh
```

Expected: `PASS: prune_old_images borra solo la imagen vieja, nunca la que está en uso`.

(El caso "imagen de otro proyecto" queda cubierto por construcción: `docker images --filter "label=org.opencontainers.image.source=..."` con la URL exacta de este repo nunca devuelve una imagen cuyo label apunte a otro repo — no hay rama de código que lo maneje distinto, así que no hace falta un tercer caso de prueba para eso.)

- [ ] **Step 5: Probar el aborto sin stash (cambios sin commitear)**

```bash
ORIG_DIR="$(pwd)"
cd /tmp && rm -rf deploy-test-repo && mkdir deploy-test-repo && cd deploy-test-repo
git init -q
git commit --allow-empty -q -m "init"
cp "$ORIG_DIR/deploy.sh" .
echo "cambio sin commitear" > archivo.txt
touch .env   # deploy.sh exige $APP_DIR/.env
set +e
bash deploy.sh --skip-frontend --skip-backend --skip-catalogo
EXIT_CODE=$?
set -e
cd "$ORIG_DIR"
rm -rf /tmp/deploy-test-repo
if [[ "$EXIT_CODE" -eq 0 ]]; then
  echo "FAIL: debía abortar con cambios sin commitear"
else
  echo "PASS: abortó (exit $EXIT_CODE) sin hacer stash"
fi
```

Expected: `PASS: abortó (exit $EXIT_CODE) sin hacer stash` — y, revisando el mensaje impreso por el script, que sea el `error "Hay cambios locales sin commitear..."` y no un `git stash` silencioso.

- [ ] **Step 6: Commit**

```bash
git add deploy.sh
git commit -m "feat: deploy.sh ya no construye imágenes, solo pull+up desde ghcr.io"
```

---

## Pasos manuales post-implementación (no son parte de ningún task — los ejecuta el usuario, no el implementador)

1. Crear las 3 GitHub Variables (`VITE_API_URL`, `NEXT_PUBLIC_API_URL`, `UPLOADS_PROXY_URL`) en Settings → Secrets and variables → Actions → Variables del repo, con los mismos valores que hoy tiene el `.env` del VPS.
2. Push a `main` y esperar el primer run en la pestaña Actions.
3. Marcar los 3 paquetes creados como públicos (perfil de GitHub → Packages → cada paquete → Package settings → Change visibility → Public).
4. En el VPS, primera vez: `git pull` a mano y después `bash deploy.sh`.
