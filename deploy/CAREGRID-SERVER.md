# CareGrid self-hosted server deployment

This deployment is intended for one Ubuntu server and one CareGrid workspace.

## Server prerequisites

- Ubuntu server
- Docker Engine with Docker Compose plugin
- Git
- A public hostname pointing to the server
- HTTPS reverse proxy such as Nginx or Caddy

## Clone and configure

```sh
git clone https://github.com/AI-Ninja-dev/caregrid.git
cd caregrid
mkdir -p caregrid-data
chmod 700 caregrid-data
cp .env.example .env.server
```

Edit `.env.server` for production. At minimum:

```env
CAREGRID_ORIGIN=https://caregrid.example.com
CAREGRID_DB_PATH=/app/data/caregrid.sqlite
CAREGRID_ALLOW_LOCAL_SETUP=false
CAREGRID_SETUP_TOKEN=REPLACE_WITH_A_LONG_RANDOM_ONE_TIME_TOKEN

THINGSBOARD_URL=
THINGSBOARD_USERNAME=
THINGSBOARD_PASSWORD=
CAREGRID_THINGSBOARD_SECRET=
THINGSBOARD_SYNC_HOURS=24
```

Generate the setup token on the server, for example:

```sh
openssl rand -hex 32
```

Do not commit `.env.server`.

## Build and start

```sh
docker compose -f docker-compose.server.yml up -d --build
docker compose -f docker-compose.server.yml ps
curl http://127.0.0.1:3001/api/health/
```

Expected health response:

```json
{"status":"ok","database":"reachable"}
```

The app binds only to `127.0.0.1:3001` on the host. Put HTTPS Nginx or Caddy in front of it before exposing CareGrid to users.

## First administrator setup

Open the HTTPS CareGrid hostname and use the one-time setup token when creating the first administrator. After setup succeeds:

1. Remove `CAREGRID_SETUP_TOKEN` from `.env.server`.
2. Recreate the container:

```sh
docker compose -f docker-compose.server.yml up -d --force-recreate
```

Keep `CAREGRID_ALLOW_LOCAL_SETUP=false` for any network deployment.

## Updating CareGrid

```sh
git pull --ff-only
docker compose -f docker-compose.server.yml up -d --build
curl http://127.0.0.1:3001/api/health/
```

Back up the SQLite database before upgrades that change persisted data.

## Backups

The database is stored on the host at:

```
./caregrid-data/caregrid.sqlite
```

Use CareGrid's verified backup command from a one-off container and copy protected backups off-host:

```sh
mkdir -p protected-backups
docker compose -f docker-compose.server.yml run --rm \
  -v "$(pwd)/protected-backups:/backups" \
  caregrid npm run backup -- /backups
```

Restrict access to both the database directory and backups.
