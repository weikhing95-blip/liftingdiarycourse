# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **Telegram Trip-PDF Bot**. A user sends ticket images to the bot, types `/done`,
and receives a single clean PDF with all their trip information synthesized and
arranged in chronological order.

> ⚠️ History note: this repo previously held a Next.js "lifting diary" app. That
> code was retired (still in git history). Ignore Next.js/Node/Drizzle/Neon
> conventions — they do not apply to the bot.

## IMPORTANT: Docs-First Requirement

**Before generating any code, Claude Code MUST first check the `/docs` directory.**
The source of truth is:

- [`/docs/BuildPlan.md`](docs/BuildPlan.md) — the phased build plan and the four
  review hats (PM, QA, Engineering, Security) that gate every phase.

All implementation decisions must align with the build plan. Do not infer or invent
patterns that contradict it.

## Architecture (planned)

- **Language/runtime:** Python, single script / small package, single host.
- **Bot framework:** a Telegram bot library (e.g. `python-telegram-bot`).
- **State:** in-memory dict keyed by Telegram user ID. A restart clears it (accepted for MVP).
- **Extraction:** each uploaded image → vision-model API → structured JSON per item.
- **PDF:** render an HTML template → PDF via **WeasyPrint** (styling is easier than low-level drawing).
- **Privacy:** raw ticket images are **discarded after extraction**. Only extracted
  fields are held in memory, and they are dropped once the PDF is delivered. Never
  persist raw tickets to disk.

## Secrets

Two credentials, kept in `.env` (never committed): the Telegram **bot token** and a
**vision-model API key**.

## Scope guardrails (out of scope for MVP)

Accounts · in-chat editing · cost splitting · groups · multi-currency · multiple
simultaneous trips · standalone app · itinerary planning. All deferred until the
core hypothesis is validated.
