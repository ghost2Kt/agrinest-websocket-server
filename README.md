# AGRINEST WebSocket Server (socket.io)

Separate Railway service for real-time order updates. Symfony broadcasts; React Native subscribes.

## Local run

```bash
cd agrinest-websocket-server
npm install
cp .env.example .env
# Edit .env — set INTERNAL_API_KEY and JWT_PUBLIC_KEY_PATH
npm run dev
```

Health: `http://127.0.0.1:3001/health`

## Railway deploy

1. New GitHub repo → push this folder.
2. Railway → **New service** → deploy from that repo.
3. Variables:
   - `INTERNAL_API_KEY` — same value as `WEBSOCKET_INTERNAL_KEY` on Symfony
   - `JWT_PUBLIC_KEY` — contents of `AGRINEST/config/jwt/public.pem` (one line with `\n`)
4. Copy the public hostname (e.g. `agrinest-ws-production.up.railway.app`).

## Symfony (main app)

```env
WEBSOCKET_BROADCAST_URL=https://YOUR-WS-SERVICE.up.railway.app
WEBSOCKET_INTERNAL_KEY=same-as-INTERNAL_API_KEY
```

## Mobile app

Set `WS_RAILWAY_HOST` in `Manlupig_appdev/src/config/ws.ts` to your Railway hostname.
