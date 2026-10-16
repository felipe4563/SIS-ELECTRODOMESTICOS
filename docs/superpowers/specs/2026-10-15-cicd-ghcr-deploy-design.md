# CI/CD con GitHub Actions + ghcr.io para el deploy

Fecha: 2026-10-15

## Contexto y objetivo

Hoy `deploy.sh` hace `git pull` y después `docker compose up -d --build
backend frontend catalogo` directamente en el VPS. Esto significa que el
VPS construye 3 imágenes Node (cada una con su propio `npm install`) cada
vez que se despliega.

El 2026-10-15, al desplegar el commit `920dbd4`, los 3 builds corriendo en
paralelo saturaron la RAM/CPU del VPS: cada `npm install` tardó ~340s, el
VPS quedó tan saturado que ni siquiera se podía abrir una nueva sesión SSH,
y hubo que cortar el deploy con Ctrl+C. (Al revisar después con
`docker compose ps`, los contenedores viejos seguían arriba y sanos — el
corte no rompió nada, porque `up -d --build` solo reemplaza los
contenedores después de que el build termina — pero el deploy quedó
pendiente y el sistema estuvo inestable varios minutos.)

**Objetivo:** que el VPS nunca más construya nada. Las imágenes se
construyen en GitHub Actions (que tiene recursos dedicados para esto) y el
VPS solo descarga (`docker compose pull`) y levanta. El deploy pasa de
varios minutos (y el riesgo de tumbar el VPS) a segundos.

Patrón ya usado en otro proyecto del mismo usuario (Clinic NovagED), aquí
adaptado a esta app.

## Qué no cambia

- **Dominios:** `appmg.arletgroup.com` sigue sirviendo `backend` (API) +
  `frontend` (Vite); `megaelectra.arletgroup.com` sigue sirviendo
  `catalogo` (Next.js SSR). El proxy/nginx que enruta a cada dominio no se
  toca.
- **Base de datos:** el servicio `db` sigue usando la imagen oficial
  `mysql:8.0` (`docker-compose.yml:5`) — nunca se construye, así que nunca
  entra al pipeline de CI. Datos en `./data/mysql` sin cambios.
- **Migraciones:** `bd/*.sql` sigue siendo gitignored (no viaja con los
  commits) y las migraciones contra producción siguen siendo manuales,
  corridas a mano contra el contenedor `db` antes de desplegar el backend
  que las necesita. Este cambio no automatiza eso.
- **Servicio `backup`:** no se construye en CI (es un repo aparte,
  `agentele_backups`, clonado localmente en el VPS). Sigue construyéndose
  ahí si hace falta, sin pasar por ghcr.io.

## Decisiones

- **Visibilidad del repo:** `github.com/felipe4563/SIS-ELECTRODOMESTICOS`
  es público. Las imágenes en ghcr.io nacen privadas igual (comportamiento
  de GitHub), así que hay un paso manual único post-primer-push: marcar
  cada uno de los 3 paquetes como público (GitHub → perfil → Packages →
  *Package settings* → Change visibility → Public). Con el repo público,
  el VPS no necesita ningún `docker login` ni token.
- **Variables de build-time:** `frontend` necesita `VITE_API_URL`;
  `catalogo` necesita `NEXT_PUBLIC_API_URL` y `UPLOADS_PROXY_URL`. Ambos
  Dockerfiles ya aceptan estos valores vía `ARG`/`ENV`
  (`frontend/Dockerfile`, `catalogo/Dockerfile`) — hoy vienen del `.env`
  del VPS a través de `docker-compose.yml:59,72-73`. En GitHub Actions no
  existe ese `.env`, así que estos 3 valores se configuran como **GitHub
  Variables** del repo (Settings → Secrets and variables → Actions →
  Variables) — no como Secrets, porque son URLs públicas
  (`https://appmg.arletgroup.com/api`, etc.), no credenciales.
- **`.dockerignore`:** revisados los 3 (`backend`, `frontend`, `catalogo`).
  Ya excluyen `.env` y, en el caso de `backend`, toda la carpeta `backups`
  (que contiene dumps `.sql` reales con datos de clientes). No se necesita
  ningún cambio — importante confirmarlo porque, a diferencia de construir
  solo en el VPS, estas imágenes van a un registro con visibilidad pública.

## Componentes

### 1. `.github/workflows/imagenes.yml` (nuevo)

En cada push a `main`:

- Matrix de 3 jobs en paralelo: `backend`, `frontend`, `catalogo`.
- Cada job construye su imagen con `docker/build-push-action`, usando el
  `Dockerfile` existente de cada servicio sin modificarlo (salvo los
  `ARG` que ya existen).
- Push a `ghcr.io/felipe4563/sis-electrodomesticos-<servicio>` con dos
  tags: el SHA completo del commit y `latest`.
- Build-args para `frontend`: `VITE_API_URL` desde la GitHub Variable del
  mismo nombre. Para `catalogo`: `NEXT_PUBLIC_API_URL` y
  `UPLOADS_PROXY_URL`, también desde Variables.
- Caché `type=gha` por servicio (acelera builds siguientes).
- `concurrency` por rama: cancela un build viejo si llega un push nuevo
  antes de que termine.
- Login a ghcr.io con `GITHUB_TOKEN` (automático, sin secret manual).
- Label `org.opencontainers.image.source` apuntando al repo, en las 3
  imágenes — es lo que `deploy.sh` usa después para filtrar qué imágenes
  limpiar sin tocar las de otros proyectos que puedan compartir el mismo
  VPS.

### 2. `docker-compose.yml`

Los 3 servicios construidos pasan de:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
```

a:

```yaml
backend:
  image: ghcr.io/felipe4563/sis-electrodomesticos-backend:${TAG:-latest}
  build:
    context: ./backend
    dockerfile: Dockerfile
```

(mismo patrón para `frontend` y `catalogo`, conservando sus `args:`). El
bloque `build:` se mantiene en los tres — permite reconstruir a mano en el
VPS (`docker compose build backend`) si GitHub Actions estuviera caído o
se necesita un build de emergencia. `db` y `backup` no cambian.

### 3. `deploy.sh` (reescrito)

Estructura dentro de una función `main()` (para que un `git pull` a medio
correr no deje el script en un estado raro):

1. Verificar prerrequisitos (igual que hoy).
2. Verificar que no haya cambios locales sin commitear — si hay, abortar
   con un mensaje claro (no hacer `stash` automático como hace hoy, para
   no esconder trabajo en curso sin que el usuario se entere).
3. `git pull --ff-only` (en vez del pull actual) contra `origin/main`.
4. `TAG=$(git rev-parse HEAD)`, exportado para que `docker compose`
   lo use al resolver `${TAG:-latest}`.
5. `docker compose up -d db` (sin cambios — sigue primero).
6. `docker compose pull backend frontend catalogo` — si alguna imagen con
   ese `TAG` todavía no existe en ghcr.io (el commit se acaba de pushear y
   Actions sigue construyendo), reintentar cada 30s hasta 15 minutos.
7. Si pasan los 15 minutos sin que aparezcan las 3 imágenes: abortar
   dejando claro que producción sigue con la versión anterior (los
   contenedores viejos nunca se tocan hasta el paso 8), y qué mirar
   (`gh run list` o la pestaña Actions del repo).
8. `docker compose up -d --no-build --remove-orphans` — nunca construye
   nada, solo baja los contenedores actuales y levanta los nuevos.
9. `docker compose up -d backup` (sin cambios).
10. Limpieza de imágenes: en vez de `docker image prune -f` (que podría
    borrar imágenes de otros sistemas si el VPS los aloja), filtrar por el
    label `org.opencontainers.image.source` de este repo y borrar solo esas
    versiones viejas.
11. Health checks y resumen final — sin cambios (mismos dominios, mismos
    endpoints).

Las flags `--skip-pull`/`--skip-frontend`/`--skip-backend`/`--skip-catalogo`
se mantienen con el mismo significado.

### 4. Rollback

Para volver a una versión anterior sin pasar por `deploy.sh`:

```bash
TAG=<sha-del-commit-anterior> docker compose up -d --no-build
```

## Pasos manuales (una sola vez)

1. Crear las 3 GitHub Variables (`VITE_API_URL`, `NEXT_PUBLIC_API_URL`,
   `UPLOADS_PROXY_URL`) en Settings → Secrets and variables → Actions →
   Variables, con los mismos valores que hoy tiene el `.env` del VPS.
2. Hacer push a `main` y esperar el primer run de Actions en la pestaña
   **Actions** (tarda más la primera vez, sin caché).
3. Marcar los 3 paquetes creados como públicos (Packages → Package
   settings → Change visibility).
4. En el VPS, primera vez: `git pull` a mano y después `bash deploy.sh`
   (el `deploy.sh` viejo todavía en disco construiría localmente; el commit
   que trae el `deploy.sh` nuevo ya solo hace pull de imágenes).

## Testing

- `bash -n deploy.sh` — sintaxis válida.
- `docker compose config` con `TAG` exportado a un valor de prueba — confirma
  que el YAML resuelve bien `${TAG:-latest}` en los 3 servicios.
- Validar el YAML del workflow (actionlint o revisión manual de la matrix,
  los tags, y los build-args).
- Si es posible, `docker build` local de cada servicio para confirmar que
  los Dockerfiles no cambiaron su comportamiento.
- En el VPS, tras el primer deploy con el nuevo flujo: confirmar con
  `docker compose images` que las 3 imágenes corriendo son `ghcr.io/...`
  y no las locales, y que los health checks pasan igual que con el flujo
  viejo.
