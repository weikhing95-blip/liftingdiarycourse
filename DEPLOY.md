# Deploying to Railway

The bot runs as a single **long-polling worker** — no public URL, no webhook,
no port to expose. Railway builds the included `Dockerfile` (which bundles the
native libraries WeasyPrint needs) and runs `python bot.py`.

## What you need first
1. A **Telegram bot token** — message [@BotFather](https://t.me/BotFather),
   send `/newbot`, follow the prompts, copy the token.
2. An **Anthropic API key** — from the Anthropic console. (Not used until the
   Phase 2 extraction step, but set it now so later deploys "just work.")

## One-time setup
1. Go to [railway.app](https://railway.app) → **New Project** →
   **Deploy from GitHub repo** → pick `liftingdiarycourse`.
2. In the service's **Settings → Source**, set the deploy branch to the one
   we're building on (`claude/charming-volta-yfv7b2`) — or to `main` once this
   is merged there.
3. Railway auto-detects the `Dockerfile` and builds. No start command needed
   (it's baked into the image).
4. Open **Variables** and add:
   - `TELEGRAM_BOT_TOKEN` = your BotFather token
   - `ANTHROPIC_API_KEY` = your Anthropic key
5. Railway redeploys. Watch **Deploy Logs** for `Bot starting (long-polling)…`.

## Test it
In Telegram, open your bot and:
- `/start` → you get the welcome instructions.
- Send any photo or PDF → you get **📩 Got it.**
- `/done` → a "not wired up yet" note (PDF generation lands in Phase 3).

## How updates ship
Every push/merge to the deploy branch triggers an automatic rebuild and
redeploy. As we build Phases 2–4, you just re-test in the same chat.

## Local run (optional)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in the token
python bot.py
```
Note: a local WeasyPrint run also needs the system libraries listed in the
`Dockerfile` (Pango/Cairo/etc.). On Railway the Docker image handles this for you.
