# backend

## Setup

```bash
pnpm --dir backend install
cp backend/.env_example backend/.env
```

Set `DATABASE_URL` in `backend/.env`.

## Database

```bash
pnpm --dir backend db:push
```

`db:push` applies the Drizzle schema. The API seeds starter data automatically on first run.

## Run

```bash
pnpm --dir backend dev
```

API base: `http://localhost:3001/api`
