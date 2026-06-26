# Telegram Trip-PDF Bot

> Send ticket images to a Telegram bot, type `/done`, and get back a single clean PDF
> with all your trip information synthesized and arranged in chronological order.

This repository was previously a Next.js "lifting diary" course app. That code has
been retired (it remains in git history) and the repo is being rebuilt around the
build plan in [`docs/BuildPlan.md`](docs/BuildPlan.md).

## Status

🚧 Pre-build. The build plan and review gates are agreed; implementation has not started.

## The North Star

One hypothesis under test: **the synthesized PDF is good enough that the user would
actually use it.** Everything in scope serves that and nothing else.

## High-level pipeline

```
images → vision extraction → in-memory session → /done → chronological sort → HTML→PDF → send
```

See [`docs/BuildPlan.md`](docs/BuildPlan.md) for the full phased plan and the four
review hats (PM, QA, Engineering, Security) that gate it.
