# Legacy Backend — MongoDB / Mongoose (ARCHIVED)

> **Do not use this for new development.**  
> This is the original root-level backend kept for historical reference.  
> The active production backend is in `backend/src/`.

## What this was

This directory (`backend/*.js`, `backend/modules/`, `backend/config/`, `backend/middlewares/`, `backend/utils/`)
was the first version of the SMT Catalogue API:

- **Database**: MongoDB 6 via Mongoose ODM
- **Modules**: categories (with tree support), products, dashboard (basic), uploads
- **No auth module** (unauthenticated endpoints)
- **API prefix**: `/api/v1/*`

## Why it was kept

- The **Categories module** logic (tree building, slug, i18n names, parent-child) was used as
  the reference design when porting categories to the Prisma/PostgreSQL schema in `src/`.
- The **utilities** (`apiResponse.js`, `pagination.js`, `logger.js`) influenced the
  unified utilities in `src/shared/utils/`.

## Production backend (use this)

```
backend/src/            ← Main application
backend/prisma/         ← PostgreSQL schema + migrations
backend/package.json    ← entry: src/server.js
docker-compose.yml      ← PostgreSQL + Redis + backend
.env.example            ← Copy to .env and fill values
```
