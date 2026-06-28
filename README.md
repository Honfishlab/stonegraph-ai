# Stonegraph AI

**Your digital memories, stored forever.**

Stonegraph is a permanent memory vault built on Arweave. It stores your photos, videos, and documents on the Arweave blockchain (200+ year lifespan) so they survive any app shutdown — including this one.

This repository is the **rebuilt version** of the original [stonegraph.ai](https://stonegraph.ai) app. The original was generated with [cofounder.ai](https://cofounder.ai); we re-architected it from scratch with clean architecture principles while preserving data, users, and the permanent Arweave storage.

---

## Why Stonegraph Exists

The pitch: Mid-to-older generations accumulate decades of digital memories — photos, videos, documents — spread across Google Drive, iCloud, Dropbox, phone SD cards. When you die, what happens to them? When you stop paying for cloud storage, who keeps them?

Stonegraph pays once to put your memories on Arweave's permanent blockchain. Anyone with the URL can access them 200 years from now, no account, no subscription, no app needed.

**Key features:**
- **Permanent Arweave storage** — pay-once, accessible forever
- **AO metadata index** — decentralized discovery layer
- **Permanent viewer page** — hosted ON Arweave itself, works without this app running
- **Family vaults** — role-based sharing (owner/admin/member/heir)
- **Memorials** — tribute pages for loved ones
- **Smart Albums** — AI-generated collections from GPT-4o-mini analysis
- **My Slate** — personal curated collections
- **Inheritance controls** — heirs inherit access after owner dies
- **TUS resumable uploads** — large files upload reliably

---

## This Repository: The Rebuild

The original `stonegraph.ai` (commit history still at `Cofounder-Customer-Projects/eternal-garden-ef422f`) was functional but had:
- Business logic scattered across API routes, lib, and DB functions
- No domain layer — everything coupled to Next.js
- Scattered Arweave integration
- No repository abstractions
- Hard to test

**This rebuild:**
- ✅ Clean domain/service/repository architecture
- ✅ Domain entities with Zod schemas (runtime validation + TypeScript types)
- ✅ Repository interfaces (swap Supabase if needed)
- ✅ Service layer orchestrates complex operations
- ✅ Infrastructure separated from business logic
- ✅ Same database, same users, same Arweave wallet — zero data loss
- ✅ All 17 original features reimplemented
- ✅ New features: My Slate, Albums, Smart Albums restructure

### What Changed From The Original

| Aspect | Original (cofounder.ai) | This rebuild |
|---|---|---|
| Smart Albums | ML service on Railway + HDBSCAN vectors + DINOv2/CLIP embeddings | Uses existing GPT-4o-mini analysis metadata (ai_subjects, ai_tags, ai_scene_type) |
| Album names | Opaque ("Cluster 47") | Self-explanatory (Outdoor, Family, Travel, etc.) |
| Architecture | Mixed: logic in routes + lib + DB functions | Clean: domain → services → repositories → infrastructure |
| Testability | Hard (everything coupled to Supabase) | Easy (mock repository interfaces) |
| ML Service Cost | ~$5/mo additional (Railway) | $0 (uses existing AI analysis) |
| User experience | Same | Same + better |

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components where possible |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | |
| Database | Supabase (PostgreSQL) | Existing shared project |
| Auth | Supabase Auth | Cookie-based server sessions |
| Storage (hot) | Supabase Storage | Staging bucket |
| Storage (permanent) | Arweave | 200+ year lifespan |
| Metadata registry | AO (HyperBeam) | Decentralized collection index |
| AI analysis | OpenAI GPT-4o-mini | Vision + tagging on every upload |
| Uploads (large) | TUS protocol | Resumable, >50MB files |
| UI icons/lucide | lucide-react | |
| Validation | Zod | Runtime + TypeScript |
| Deploy target | Vercel | stonegraph.ai domain |

---

## Architecture

```
src/
├── domain/                          # Pure business logic, no framework
│   ├── entities/                    # Zod schemas + TypeScript types
│   │   ├── memory.ts                # Core memory unit
│   │   ├── family.ts                # Family vault + members
│   │   ├── billing.ts               # Subscription tiers
│   │   ├── memorial.ts              # Tribute pages
│   │   ├── profile.ts               # User profiles
│   │   ├── slate.ts                 # User-curated collections
│   │   ├── album.ts                 # Photo albums
│   │   ├── image-cluster.ts         # AI-generated clusters
│   │   └── user-purchase.ts         # Stripe records
│   ├── repositories/                # Framework-agnostic interfaces
│   │   ├── memory-repository.ts
│   │   ├── family-repository.ts
│   │   ├── memorial-repository.ts
│   │   ├── slate-repository.ts
│   │   └── album-repository.ts
│   └── services/                    # Business orchestration
│       ├── memory-service.ts
│       ├── family-service.ts
│       ├── memorial-service.ts
│       ├── curation.ts              # SlateService + AlbumService
│       └── upload-orchestrator.ts   # 7-step upload pipeline
│
├── infrastructure/                  # Framework-dependent code
│   ├── database/                    # Supabase clients
│   │   ├── client.ts                # Browser (singleton)
│   │   ├── server.ts                # Server (cookie-bound)
│   │   └── admin.ts                 # Service role (bypasses RLS)
│   ├── arweave/                     # Permanent file storage
│   │   └── service.ts               # uploadBuffer, uploadFile
│   ├── ao/                          # AO compute service
│   │   └── service.ts               # addMemoryToAO, getFamilyCollection
│   ├── repositories/                # Supabase implementations
│   │   ├── supabase-memory.repository.ts
│   │   ├── supabase-family.repository.ts
│   │   ├── supabase-memorial.repository.ts
│   │   ├── supabase-slate.repository.ts
│   │   └── supabase-album.repository.ts
│   └── payments/                    # Stripe
│
├── app/                             # Next.js routes
│   ├── (vault)/                     # Route group: shared vault layout
│   │   ├── vault/                   # Dashboard
│   │   ├── memories/                # All memories browse
│   │   ├── memories/[id]/           # Memory detail + permanent viewer button
│   │   ├── upload/                  # Upload form
│   │   ├── family/                  # Family management
│   │   ├── slates/                  # My Slate list
│   │   ├── slates/new/              # Create slate
│   │   ├── slates/[id]/             # Slate detail
│   │   ├── albums/                  # Albums list (incl. smart albums)
│   │   ├── albums/new/              # Create album
│   │   ├── albums/[id]/             # Album detail
│   │   ├── smart/[slug]/            # Smart album detail (AI-curated)
│   │   ├── memorial/                # Memorial management
│   │   ├── settings/                # User settings
│   │   └── billing/                 # Billing page
│   ├── api/                         # REST endpoints (~40 routes)
│   │   ├── auth/                    # signin, signup, signout, user
│   │   ├── memories/                # CRUD + upload + permanent viewer
│   │   ├── family/                  # CRUD, invites, members
│   │   ├── memorials/               # CRUD + items
│   │   ├── slates/                  # CRUD + memories
│   │   ├── albums/                  # CRUD + memories
│   │   ├── upload/tus/              # TUS resumable upload
│   │   └── upload/tus/[uploadId]/   # Resumable chunk handling
│   ├── auth/                        # Auth page UI
│   ├── memorial/[slug]/             # Public memorial view (no login)
│   └── memories/[id]/viewer/        # Permanent viewer page
│
└── components/                      # React components
    ├── vault/                       # Vault UI (sidebar, memory cards, etc.)
    ├── memories/                    # Memory-specific components
    │   ├── PermanentViewerButton.tsx
    │   └── ArweaveBadge.tsx
    └── ...
```

**Dependency flow (one-way):**
```
app (routes, pages)
  ↓ uses
domain/services
  ↓ depends on (interfaces)
domain/repositories
  ↓ implemented by
infrastructure/repositories (Supabase)
  ↓ uses
infrastructure/database (Supabase clients)
```

The `domain/` layer has **no imports from `infrastructure/` or `app/`**. This is the key architectural invariant — it makes services unit-testable with mocked repositories.

---

## Feature Status

| Feature | Status | Routes |
|---|---|---|
| Auth (signin/signup/signout) | ✅ Done | `/auth/*`, `middleware.ts` |
| Vault dashboard | ✅ Done | `/vault` |
| Memory upload (files + TUS) | ✅ Done | `/vault/upload`, `/api/upload/tus/*` |
| Memory browse + detail | ✅ Done | `/vault/memories`, `/vault/memories/[id]` |
| Family management | ✅ Done | `/vault/family` |
| Family invitations | ✅ Done | `/api/family/invite/*` |
| Memorial pages | ✅ Done | `/vault/memorial/*`, `/memorial/[slug]` |
| My Slate (curated collections) | ✅ Done | `/vault/slates/*` |
| Albums (photo collections) | ✅ Done | `/vault/albums/*` |
| Smart Albums (10 AI categories) | ✅ Done | `/vault/smart/[slug]` |
| Arweave permanent storage | ✅ Done | `infrastructure/arweave/service.ts` |
| AO metadata sync | ✅ Done | `infrastructure/ao/service.ts` |
| Permanent viewer page | ✅ Done | `/memories/[id]/viewer`, `public/viewer.html` |
| Billing UI | ✅ Done | `/vault/billing` |
| Stripe checkout | ⚠️ Scaffolded, not tested | Need to wire webhook handler |
| My Slate Arweave publishing | ⚠️ Not started | Would publish manifest to Arweave |
| Automated tests | ❌ None | Zero tests currently |
| CI/CD pipeline | ❌ None | (Vercel handles deploy, which is sufficient for now) |

---

## Smart Albums — The Rethink

The original app had a separate ML service (Railway, ~$5/mo) that extracted DINOv2 + CLIP embeddings and ran HDBSCAN clustering to produce opaque group names like "Cluster 47" that users still needed to rename.

We already have GPT-4o-mini analyzing every uploaded photo for:
- `ai_subjects[]` (e.g., "person", "dog", "beach")
- `ai_tags[]` (e.g., "vacation", "sunset", "family")
- `ai_scene_type` (e.g., "outdoor", "indoor", "celebration")
- `ai_faces_detected` (number)
- `ai_face_labels[]` (who is in the photo)
- `ai_time_of_day` ("morning", "night", etc.)
- `exif_location`

**Instead of running clustering, we filter memories through predicates against this metadata.** Each Smart Album is pure logic, zero storage, zero AI cost:

```typescript
{
  id: "outdoor",
  title: "Outdoor",
  icon: "🌳",
  predicate: (m) =>
    m.ai_scene_type?.toLowerCase().includes("outdoor") ||
    m.ai_tags?.some(t => ["nature","park","garden","forest","beach","mountain"]
      .includes(t.toLowerCase()))
}
```

**10 Smart Albums:** Outdoor 🌳, Family 👨‍👩‍👧‍👦, Travel ✈️, Celebrations 🎉, Food 🍽️, Nature 🌺, Night 🌙, Indoor 🏠, People 🤝, Animals 🐾

Result: self-explanatory names, instant updates (new photos appear as soon as AI analyzes them), zero additional cost, no ML service to run.

---

## Database

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles (1:1 with auth.users) |
| `families` | Family vaults |
| `family_members` | User ↔ Family join with role |
| `invitations` | Pending invites with token |
| `memories` | Photos/videos/docs (core table) |
| `memorials` | Tribute pages |
| `memorial_items` | Memorial ↔ Memory join |
| `slates` | User-curated collections (new) |
| `albums` | Custom photo albums (new) |
| `user_purchases` | Stripe subscription records |
| `tus_uploads` | Resumable upload tracking |

All IDs are UUIDs. All timestamps are TIMESTAMPTZ. `memories` has ~40 columns including AI analysis fields, ML embeddings, and Mux video transcoding fields.

### Migrations

Stored in `supabase/migrations/`:
- `20260101000002_create_slates_and_albums.sql` — The migration we ran for this rebuild. Creates both tables, RLS policies, indexes, `updated_at` triggers, and atomic RPC helpers (`slate_add_memories`, `album_remove_memories`, etc.).

The original tables (`memories`, `families`, etc.) were created by the cofounder.ai build and live directly on the existing Supabase project.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase (REQUIRED — same as original stonegraph.ai app)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI (REQUIRED for AI analysis)
OPENAI_API_KEY=...

# Arweave (REQUIRED for permanent storage)
ARWEAVE_WALLET_JWK=<JSON-stringified JWK wallet>
NEXT_PUBLIC_AO_PROCESS_ID=_DlCBw9F1K-Kb5LshIQA9DpyMpsAUZ-cl6TxVU-hj5U
NEXT_PUBLIC_AO_VIEWER_TX_ID=...   # TX of viewer.html on Arweave

# Stripe (needed for billing)
STRIPE_SECRET_KEY=...

# Postmark (for email invites)
POSTMARK_API_KEY=...

# Misc
INTERNAL_BACKFILL_TOKEN=...        # For batch analysis endpoints
ML_API_URL=...                     # Optional, legacy ML service
NEXT_PUBLIC_APP_URL=https://stonegraph.ai
```

The original Supabase project is at `https://zjruepupazshxybsxbsz.supabase.co` and holds all existing user data.

---

## Setup

```bash
git clone https://github.com/Honfishlab/stonegraph-ai.git
cd stonegraph-ai

npm install

# Configure environment
cp .env.local.example .env.local
# Fill in the required keys in .env.local

npm run dev        # http://localhost:3000
npm run build      # Production build
```

## Deploy

The repo is configured for Vercel:

```bash
npm install -g vercel
vercel login
vercel --prod
```

Or connect `Honfishlab/stonegraph-ai` to Vercel via the dashboard — it picks up `vercel.json` automatically.

Environment variables must be configured in the Vercel dashboard under the project settings.

---

## Known Gaps

**High priority (block proper use):**
- Some existing data references the cofounder.ai schema; not all fields are 1:1
- The permanent viewer page has not yet been deployed to Arweave (TX ID is placeholder)
- Stripe webhook handler is not wired up

**Medium:**
- No automated tests
- No loading states / optimistic UI in some places
- Search/filter not implemented
- Pagination missing from large lists

**Low:**
- SEO metadata incomplete
- No analytics
- No email notification system
- No collaborative/invitation-based album editing

---

## Repository

**GitHub:** https://github.com/Honfishlab/stonegraph-ai

**Commits (17, clean):**

```
3454777 Add vercel.json for deployment config
1b0d6ec docs: add documentation for slates and albums
3fd2c97 feat: frontend pages for slates, albums, smart albums
102ff88 fix: align slates/albums migration with domain entities
e7f5949 feat: My Slate and Albums curation features
2513488 feat: AO Permanent Viewer
62382b6 feat: TUS resumable upload
19e277a feat: memorial UI pages
55e4584 feat: memorial repository and API
b7b3530 feat: family management UI
0430d63 feat: family API routes
ed9cb66 feat: vault frontend pages
981cc12 feat: auth system
63e1043 feat: memory API routes
4b13007 Phase 3: Arweave + AO + Upload orchestrator
5620e68 Phase 2: Supabase repository implementations
3410f93 Foundation: domain layer, infrastructure, app shell
```

---

## License

Private — internal Stonegraph project.

## Credits

- Original concept and live app: [stonegraph.ai](https://stonegraph.ai) (cofounder.ai generated)
- Rebuild architecture: Hermes Agent session w/ Wayne
- Storage: [Arweave](https://arweave.org) + [AO](https://ao.arweave.dev)
- AI: OpenAI GPT-4o-mini for vision analysis
- Platform: [Vercel](https://vercel.com) + [Supabase](https://supabase.com)
