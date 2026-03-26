# WAY ONE Professional Upgrade (work in progress)

## Included in this package
- dynamic DB tables for qualification levels, investment plans and FAQ
- admin backend CRUD for levels and investment plans
- public app config endpoint
- invest backend refactor to use DB plans instead of hardcoded plans
- cron refactor to read level config from DB
- user stats endpoint
- saved wallets + password update support in user route
- frontend: new Invest center with dynamic plans + FAQ
- frontend: new Network page with invite link + QR
- frontend: improved Dashboard
- frontend: admin settings panel extended for levels and plans
- frontend: admin boolean permission fix
- frontend: referral query prefill in registration

## Required after deploy
1. import updated `schema.sql`
2. run backend `npm install && npm run build`
3. run frontend `npm install && npm run build`
4. copy frontend `dist` to nginx web root
5. restart pm2 + nginx

## Important note
This is a substantial refactor. Before going live, test:
- register/login
- admin dashboard
- invest plan creation
- daily cron payouts
- referral + QR registration
- deposits / withdrawals
- profile password change
