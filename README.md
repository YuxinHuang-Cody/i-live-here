# i-live-here

**English** · [简体中文](./README.zh-CN.md)

A London map-pinning MVP — a web app for marking "fun things I do here" and "things I want to do" on a map.

## Tech stack

- **Vite + React 18 + TypeScript** (ESM, no bundler config beyond `vite.config.ts`)
- **react-map-gl** (Mapbox GL v3) for the base map; default style is `mapbox://styles/mapbox/standard`
- **@supabase/supabase-js** for the optional cloud backend (Postgres + Storage + Realtime)
- No state-management library — local React state plus a small custom hook (`usePins`)
- No CSS framework — plain CSS per-component

Data layer `src/services/pinService.ts` has two implementations behind one interface:

- **Local mode** (default): pins / images / likes all live in the browser's localStorage. Images are inlined as data URLs.
- **Supabase mode** (auto-enabled when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set): pins in Postgres, images in a public Storage bucket, list updates via a Realtime channel.

## Getting started

```bash
npm install

cp .env.example .env.local
# Edit .env.local — at minimum fill in VITE_MAPBOX_TOKEN.
# Leave the two Supabase vars empty → local mode; fill them both in → Supabase mode.

npm run dev      # vite dev server on http://localhost:5173
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then `vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Project-references type check, no emit |

### Environment variables

All vars are `VITE_*` prefixed so Vite exposes them to the client bundle.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | yes | Public Mapbox access token (`pk.*`). Lock it down with URL restrictions in the Mapbox dashboard. |
| `VITE_SUPABASE_URL` | optional | Supabase project URL. Empty → local mode. |
| `VITE_SUPABASE_ANON_KEY` | optional | Supabase anon public key. Must be paired with the URL. |

### Browser requirements

Uses `createImageBitmap` (with `imageOrientation: 'from-image'`), `crypto.randomUUID`, the Geolocation API, and CSS features common to evergreen browsers — modern Chrome / Safari / Firefox / Edge. No IE / old-Safari fallbacks.

## Wiring up Supabase (shared + persistent)

1. **Create a project** — at https://supabase.com/dashboard, wait a few minutes for it to spin up.
2. **Run the SQL** — in Studio's left sidebar: SQL Editor → New query → paste the contents of `supabase/setup.sql` → Run. The script is idempotent — safe to re-run. It creates the `pins` table, applies RLS, adds the `toggle_pin_like` and `delete_pin` RPCs, creates the `pin-images` storage bucket and its policies, and adds the table to the `supabase_realtime` publication.
3. **Grab credentials** — Project Settings → API:
   - `Project URL` → `VITE_SUPABASE_URL` in `.env.local`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
4. Restart `npm run dev`. If you see a realtime channel subscription log in the console, you're good.
5. When deploying to Vercel (or any host), add the same two vars to the host's Environment Variables.

### Security model in Supabase mode

- **Anonymous read/write**: any visitor can list all pins, create pins, and like them. There is no auth.
- **Reads exclude `owner_token`**: a column-level `GRANT SELECT (...)` skips the token column, so even though RLS allows `select` on the row, anon clients can't read other users' tokens.
- **Deletes are gated by an `owner_token`**: when a pin is created, the client generates a random token, stores it in localStorage under that pin's id, and includes it on the row. Deletion goes through the `delete_pin(id, token)` RPC, which only deletes if the token matches. Switch devices or clear cache → you lose delete rights, but the pin stays.
- **Direct `update` / `delete` on the table is blocked** — there is no policy granting either. All mutations go through RPCs.
- **Likes go through `toggle_pin_like(id, delta)`** — clamped to `>= 0` server-side so the count can't be pushed negative.
- **Image bucket** `pin-images` is publicly readable (required for `getPublicUrl`). Uploads are restricted to that bucket. A delete policy lets anyone delete an *orphan* image (one no longer referenced by any pin), which powers the post-delete cleanup in `supabasePinService` — but it can't drop a live photo.
- No real identity system, so spam is still possible. For a serious launch, add Supabase Auth (even anonymous sessions) plus rate limiting.

## Usage

- Drag / pinch to zoom the map.
- On first load, the app asks for geolocation and auto-centers on you. If denied, it falls back to the **Jeremy Bentham Room** at UCL (`-0.13396, 51.5246`, zoom 16.4) — see `src/config.ts` to change.
- Top-right ➕ → pick "fun thing I do here" (`doing`) or "thing I want to do" (`wishlist`).
- A floating pin appears at the map center with a crosshair — pan the map to your target spot → tap **Pin it here** at the bottom.
- A bottom sheet slides up: **title** / **longer note** / **image** / **name** (blank → `栖居者` / "inhabitant").
- Images are resized to max 1200px on the long edge and re-encoded as JPEG (quality 0.85) before storage — EXIF orientation is respected. In local mode they're inlined as data URLs; in Supabase mode they're uploaded to the bucket and the row stores the path.
- Tap an existing pin to see details, like it, or — if it's yours (i.e. you have its `ownerToken` in localStorage) — delete it.

## Data model

```ts
type PinKind = 'doing' | 'wishlist';

interface Pin {
  id: string;
  kind: PinKind;
  title: string;
  note: string;
  lng: number;
  lat: number;
  author: string;     // blank input → '栖居者' (anonymous)
  imageUrl?: string;  // data URL (local) or public Supabase URL
  likes: number;      // clamped to >= 0
  createdAt: number;  // epoch ms
}
```

Per-browser preferences in localStorage (`src/services/prefs.ts`):

- which pins this browser has liked (so the UI shows the toggled state)
- last-used author name (prefilled in the form)
- per-pin `ownerToken` (Supabase mode), used to authorize deletion

## Layout

```
src/
  components/
    Map/             MapView, ➕ button, crosshair, pin markers, locate button, user blue dot
    BottomSheet/     draggable bottom sheet
    Forms/           new-pin form + detail card
  hooks/
    usePins.ts          pin list + likes + ownership; wires realtime in Supabase mode
    useUserLocation.ts  geolocation wrapper
  services/
    pinService.ts          interface + auto-switching + local implementation
    supabasePinService.ts  Supabase implementation (Postgres + Storage + Realtime)
    supabase.ts            client (null if env vars missing)
    imageCompress.ts       resize + JPEG re-encode + dataURL helper
    prefs.ts               local user prefs (liked / lastAuthor / ownerToken)
  types/pin.ts        Pin / PinDraft / PinKind / ANONYMOUS_AUTHOR
  config.ts           INITIAL_VIEW, MAPBOX_TOKEN, MAP_STYLE
supabase/
  setup.sql           one-shot: tables + RLS + RPCs + bucket + realtime
```

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages, etc.). Build command `npm run build`, output `dist/`. Don't forget to set `VITE_MAPBOX_TOKEN` (and optionally the two Supabase vars) in the host's environment.
