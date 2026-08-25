# CLAUDE.md

> How to work with me. Read this before every session.

---

## Core Value – everything revolves around this

> EZwallet was built on a simple belief: everyone should be able to own their
> own money, without needing to become a crypto expert.
>
> Self-custody shouldn't mean memorizing seed phrases, copying long wallet
> addresses, or worrying about gas tokens. Those are technical barriers, not
> the value of crypto.
>
> We believe people shouldn't have to adapt to crypto. Crypto should adapt to
> people, making it simple enough for anyone to use while preserving full
> ownership of their money.

Every feature, UX decision and technical trade-off has to serve this belief:
everyday people (not crypto natives) holding their own money, without having to
learn crypto to use it. Any proposal that makes the user "adapt to crypto"
(seed phrases, hex addresses, a separate gas token...) is wrong by default – raise it
and ask, do not just build it.

---

## Who I Am

I'm a **Vietnamese vibecoder** – I have ideas, not a programming background. I build products by handing off to AI, not by writing every line myself.

**How I learn and work:**
- I learn by **actually building**, not from books or tutorials.
- I want to **understand while building**, not sit through a lecture first.
- I'm **decisive and push back fast** when output is off – don't guess and make me review later.
- I **plan carefully in Claude Desktop**, then hand off to Claude Code to build step by step.

**What I'm building – two directions:**

**Direction 1: Data → Predictions**  
My background is crypto research (VHG, 2023-2024). Now I do content + community ([0xhieu.xyz](https://0xhieu.xyz)). I have datasets on TGE, FDV, market conditions. I build tools that turn **data and statistics into predictions** – e.g., predict TGE FDV from fundraising + VC allocation, project scoring, market signal dashboards.

**Direction 2: Simple dapps for everyday users**  
I'm a code noob, so I don't try to build DEXs or complex AMMs. I aim for **small but useful dapps** – payment app (QuickPay), savings app (PigSave), trading agent (Arcis). Target users are **regular people**, not DeFi degens – UX must be simple, mobile-first, explainable in one sentence.

**Stack**: Solidity + Cloudflare Workers + Cloudflare Pages  
**Chains**: Arc, Seismic, Monad (EVM-compatible)  
**AI integration**: Anthropic API (Claude)  
**GitHub**: KattyFury · **Local projects**: `Desktop/Claude/`

---

## How to Talk to Me

- Respond in **Vietnamese**. Use English for code, technical terms, and proper nouns.
- **No filler**: skip "Great question!", "Sure!", "Certainly!".
- **Answer directly**. Short task = short answer.
- **Don't dump theory** – build first, explain when needed.
- **Don't assume I know jargon** – explain inline when using technical terms.
- **Multiple approaches → show options, don't pick silently.**
- **Not sure → say so, don't guess.**

---

## Brand Voice – GET THIS RIGHT

- **The settled slogan, used verbatim everywhere:** *"A crypto wallet simple enough for my mom to use."*
  - English only – the project dropped Vietnamese and Chinese on 2026-08-25.
  - NO variants: not "your grandma", not "your mom", not "stablecoin wallet".
  - Places that must match: `<title>` + `og:title` + `twitter:title` in `index.html`, the image `public/og.png`,
    `package.json` description, `README.md`, `PITCH.md`, slide P1 trong `DECK-DESIGN-SPEC.md`.
- **Long dashes: ONLY the en dash `–` (U+2013). NEVER the em dash `—` (U+2014).**
  Applies to every word a reader sees: the web app, documents, slides, posts. (Code comments in `src/`
  are English now, and the same rule is worth keeping there too.)
- Changing the slogan → rebuild `public/og.png` (script `C:\tmp\ezw-verify\make-og.mjs` + `og-card.html`,
  1200×630) and bump the `?v=` in `og:image` so X/Facebook re-scan the card.

---

## How to Write Code

- **Think before coding**: state assumptions before writing the first line.
- **Stay in scope**: I asked to fix one function, fix one function. Don't touch other files.
- **Ask before**: big refactors, architecture changes, anything touching >3 files.
- **Simplicity first**: if 200 lines could be 50, rewrite it. No "flexibility" or "future-proofing" I didn't ask for.
- **Summarize after every edit**: what changed, why.
- **Loop until verified**: don't stop at "it should work" – verify it actually works.

---

## When Editing Existing Code

- **Touch only what you must**: don't "improve" adjacent code, comments, formatting.
- **Don't refactor what isn't broken**: match existing style even if you'd do it differently.
- **See unrelated dead code**: mention it, don't delete it.
- **Clean up your own orphans**: imports / variables / functions made unused by YOUR changes → remove them.
- **The test**: every changed line must trace back to my actual request.

---

## My Workflow

I work in this order. Don't skip steps:

1. **Plan in Claude Desktop** – brainstorm, design, write spec
2. **Generate spec file** – detailed `.md` for handoff
3. **Hand off to Claude Code** – implement step by step, don't jump ahead

When I'm in **planning phase**, don't rush to code. When I have a spec, don't re-design.

---

## Tech Stack – Locked

> Don't suggest alternatives unless I ask.

- **Smart contracts**: Solidity + Foundry
- **Backend/API**: Cloudflare Workers (TypeScript)
- **Frontend/hosting**: Cloudflare Pages
- **Chains**: Arc / Seismic / Monad (EVM-compatible)
- **AI**: Anthropic API
- **Secrets**: `.dev.vars` local + Cloudflare Dashboard Variables. **Never hardcode keys in source.**

---

## Absolute DON'Ts

- ❌ Pick an approach silently when multiple options exist – present them and ask
- ❌ Touch files unrelated to the request
- ❌ Refactor code that's working fine
- ❌ Delete dead code unless asked
- ❌ Push to prod, drop databases, run irreversible commands without explicit confirmation
- ❌ **Hardcode API keys, secrets, env variables** (GitHub bots scan within minutes)
- ❌ Suggest changing the tech stack unless I ask
- ❌ Dump theory when I need to build
- ❌ Assume I know technical terms
- ❌ Stop at "it should work" – verify

---

## Hard Decisions → Think Deeply

For architecture choices, security tradeoffs, or major decisions → use Extended Thinking. Don't propose hastily.

---

## Required Process for Every Project

When starting a new project, automatically create a `HANDOFF.md` in the root that holds everything about the project: stack, architecture, data flow, decisions log, and failed approaches.

- **Decisions Log** – `- [date]: [decision] – reason: [why]`
- **Failed Approaches** – `- [date]: Tried [approach] → failed because [reason] → switched to [alternative]`

Update after each session. Don't wait for me to remind you.

---

## How to Know You're Doing It Right

- Diffs contain only what I requested
- No surprise refactors
- Clarifying questions come **before** implementation, not after mistakes
- No re-suggesting decisions already made
- Code is simple the first time, no rewrite needed
