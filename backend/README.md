# backend

## Setup

Requires Bun installed. Backend `dev`/`start` scripts directly invoke the `bun` binary.

```bash
pnpm --dir backend install
cp backend/.env_example backend/.env
```

Set `DATABASE_URL` and `CORS_ORIGINS` in `backend/.env`.

## Database

```bash
pnpm --dir backend db:push
```

`db:push` applies the Drizzle schema. The API seeds starter data automatically on first run.

## Run

Requires Bun installed.

```bash
pnpm --dir backend dev
```

API base: `http://localhost:3001/api`
