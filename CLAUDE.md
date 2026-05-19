# Spinmfana — Claude Code Instructions

> 📚 **Canonical patterns live in the BAB framework.** Read these first:
> - `/home/charl/code/bab/knowledge/auth.md` — OTP sign-in + display-name capture
> - `/home/charl/code/bab/knowledge/design-systems.md` — games UI components
> - `/home/charl/code/bab/knowledge/security.md` — HumanVerify + headers + audit log
> - `/home/charl/code/bab/knowledge/conventions.md` — cross-cutting rules

Spinmfana is a South African car-spinning / drift arcade game. BAB slug:
`spinna` | Table prefix: `spinna_` | Domain: `spinmfana.com`.

## Key rules

- **Auth**: OTP-only email sign-in via the canonical module (`lib/otp.ts` wraps
  `lib/otp-core.ts`). Cookie: `spinna_session`. HumanVerify HMAC token required.
- **Single-player**: no online multiplayer; rooms code path not used.
- **Profile**: `spinna_players.display_name` captured first time the player tries
  any action that names them publicly (leaderboard, scoreboard).
- **Design system**: games — `components/games/` + `lib/games-DS` tokens in
  `app/globals.css`. Hero font Anton, accent amber `#fcd00b`, accent-2 red `#ff2d2d`.
- **Canvas**: rendering in `components/spinna-canvas.tsx`; HUD overlay in
  `components/spinna-hud.tsx` uses `≡ MENU` button → `PauseOverlay` (no scattered
  options inside gameplay).
- **Mobile-first** + inputs ≥16px via globals.css `!important`.

@AGENTS.md
