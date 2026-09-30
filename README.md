# VITA — Your life. Your character.

## Run it (5 steps)
Requires Node 20+ and Docker (or any PostgreSQL 14+).

1. `docker compose up -d`          # starts PostgreSQL on :5432
2. `cp .env.example .env`          # then set AUTH_SECRET (run: openssl rand -base64 32)
3. `npm install`
4. `npm run setup`                 # creates tables + seeds 7 demo players
5. `npm run dev`                   # open http://localhost:3000

Log in: adi@vita.dev / vita1234 (every seeded user shares this password), or create a new character at /register.
No API key needed. Add ANTHROPIC_API_KEY to .env to use Claude as the Game Master.

## No Docker?
Install PostgreSQL yourself, create a database named `vita`, and set DATABASE_URL in .env.

## Troubleshooting
- "Can't reach database": is `docker compose ps` showing the db running?
- "AUTH_SECRET missing": set it in .env, restart `npm run dev`.
- Type errors after schema edits: `npx prisma generate`.
- Start over: `npx prisma db push --force-reset && npm run db:seed`.

## Routes
/ dashboard · /quests · /challenges · /party · /guilds · /feed · /compare?with=handle · /chronicle · /u/handle · /notifications · /settings/privacy
