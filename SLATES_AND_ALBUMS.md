# Stonegraph AI - Slates & Albums Feature Documentation

**Date:** June 24, 2026  
**Commit:** 3fd2c97

## Overview

This document describes the newly implemented Slates and Albums features, and explains the restructured Smart Albums approach.

---

## 1. My Slates (Personal Collections)

**Location:** `/vault/slates`

### Purpose
Slates are user-curated, themed collections of memories. Different from albums, slates have a **type** and can be **chronological** (year-based) or **public** (visible to family members).

### Slate Types
- **Personal** - Private personal collections
- **Family** - Family-focused memories
- **Travel** - Trip and journey memories
- **Milestones** - Important life events
- **Custom** - User-defined themes

### Key Features
- Title and description
- Optional year field (for chronological slates)
- Public/private visibility toggle
- Auto-generated slugs from title
- Memory count tracking
- Ordered memory arrays (users can arrange memories)

### API Endpoints
```
GET    /api/slates              - List all slates
POST   /api/slates              - Create new slate
GET    /api/slates/[id]         - Get slate details
PATCH  /api/slates/[id]         - Update slate metadata
DELETE /api/slates/[id]         - Delete slate
POST   /api/slates/[id]/memories - Add memories to slate
DELETE /api/slates/[id]/memories - Remove memories from slate
```

### Database Schema
```sql
CREATE TABLE slates (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- personal, family, travel, milestones, custom
  year INTEGER,
  cover_memory_id UUID,
  memory_ids UUID[],
  is_generated BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 2. Albums (Custom Photo Collections)

**Location:** `/vault/albums`

### Purpose
Albums are standard photo collections - simple, user-created groupings of memories with cover images and privacy controls.

### Key Features
- Title and description
- Auto-generated slugs
- Cover image selection
- Public/private visibility toggle
- Memory count tracking
- Ordered memory arrays

### API Endpoints
```
GET    /api/albums              - List all albums
POST   /api/albums              - Create new album
GET    /api/albums/[id]         - Get album details
PATCH  /api/albums/[id]         - Update album metadata
DELETE /api/albums/[id]         - Delete album
POST   /api/albums/[id]/memories - Add memories to album
DELETE /api/albums/[id]/memories - Remove memories from album
```

### Database Schema
```sql
CREATE TABLE albums (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_memory_id UUID,
  memory_ids UUID[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Row Level Security
- Users can only view their own albums (or public ones)
- Users can only create/update/delete their own albums
- Family members can view albums that are marked public

---

## 3. Smart Albums (AI-Curated Dynamic Collections)

**Location:** `/vault/smart/[slug]` (accessed from Albums page)

### Rethinking Smart Albums

**Old Approach (Rejected):**
- ML vectors + HDBSCAN clustering
- Stored in database as static records
- Required separate ML service
- Clusters were opaque to users
- "Cluster 47" → meaningless unless renamed

**New Approach (Implemented):**
The original Cofounder.ai app already had powerful AI analysis on every memory:
- `ai_subjects[]` - What's in the photo
- `ai_tags[]` - Descriptive tags
- `ai_scene_type` - The setting/context
- `ai_faces_detected` - Number of faces
- `ai_face_labels[]` - Who is in the photo
- `ai_time_of_day` - When it was taken
- `exif_location` - Where it was taken

**Instead of running clustering, we use this existing metadata to create dynamic smart albums:**

### 10 Smart Album Categories

| Slug | Title | Icon | Filter Logic |
|------|-------|------|--------------|
| `outdoor` | Outdoor | 🌳 | `ai_scene_type` contains "outdoor" OR `ai_tags` includes nature/park/garden/forest/beach/mountain |
| `family` | Family Moments | 👨‍👩‍👧‍👦 | `ai_face_labels` includes family roles OR `ai_subjects` includes "family" |
| `travel` | Travel | ✈️ | `ai_tags` includes travel terms OR `exif_location` is set |
| `celebration` | Celebrations | 🎉 | `ai_tags` includes birthday/party/wedding/holiday/christmas/celebration |
| `food` | Food & Drinks | 🍽️ | `ai_subjects` includes food/drink/meal/dish/recipe/restaurant |
| `nature` | Nature | 🌺 | `ai_tags` includes plant/flower/tree/animal/bird/landscape |
| `night` | Nighttime | 🌙 | `ai_time_of_day` is "night" or "evening" |
| `indoor` | Indoor | 🏠 | `ai_scene_type` contains "indoor" |
| `people` | People | 🤝 | `ai_faces_detected > 0` |
| `animals` | Animals & Pets | 🐾 | `ai_subjects` includes dog/cat/bird/horse/pet/animal |

### How It Works

1. **Dynamic Filtering:** Smart albums are NOT stored in the database. They're computed on-the-fly by filtering all family memories through a predicate function.

2. **Zero Additional AI Cost:** We're already running GPT-4o-mini analysis on every uploaded memory. Smart albums just use that existing metadata.

3. **Always Current:** New photos are automatically included in smart albums as soon as they're analyzed - no re-clustering needed.

4. **Transparent to Users:** Each smart album has a clear name, icon, and description. Users understand what "Outdoor" or "Family Moments" means.

### Architecture

```
User uploads photo
    ↓
GPT-4o-mini analyzes → ai_subjects, ai_tags, ai_scene_type, etc.
    ↓
Photo appears in relevant smart albums automatically
    ↓
Smart albums page shows 10 categories with live counts
```

**No ML service needed. No clustering. No additional storage.**

---

## 4. UI/UX

### Navigation Sidebar
Updated to include:
- 📋 My Slates
- 📸 Albums (which shows both user albums AND smart albums)

### Albums Page Layout
```
┌─────────────────────────────────────┐
│ Albums                              │
├─────────────────────────────────────┤
│                                     │
│ ✨ Smart Albums (AI-curated)        │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │ 🌳 │ │ 👨‍│ │ ✈️ │ │ 🎉 │       │
│ │Out │ │Fam │ │Trv │ │Cel │       │
│ │ 12 │ │ 8  │ │ 5  │ │ 3  │       │
│ └────┘ └────┘ └────┘ └────┘       │
│                                     │
│ Your Albums                         │
│ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ [cover]│ │ [cover]│ │ [cover]│   │
│ │ Title  │ │ Title  │ │ Title  │   │
│ │ 15mem  │ │ 8mem   │ │ 22mem  │   │
│ └────────┘ └────────┘ └────────┘   │
│                                     │
│ [+ Create Album]                    │
└─────────────────────────────────────┘
```

### Key UX Decisions
1. **Smart albums appear at top** - They're the "recommended" view, always fresh
2. **User albums below** - Explicit, curated collections
3. **Visual distinction** - Smart albums have ✨ badge and icon-based cards
4. **Easy creation** - One-click "Create Album" button
5. **Public/private toggle** - Users control visibility

---

## 5. Benefits of the New Approach

### vs. Old Cofounder.ai Smart Albums
✅ No separate ML service needed  
✅ No vector storage overhead  
✅ No HDBSCAN clustering complexity  
✅ Albums are self-explanatory (not "Cluster 47")  
✅ Instant updates (no re-clustering lag)  
✅ Zero additional AI costs  

### vs. Traditional Photo Apps
✅ AI analysis happens automatically on upload  
✅ Smart albums emerge organically from memory metadata  
✅ No manual tagging required  
✅ Users don't need to organize - AI does it  
✅ Permanent storage on Arweave  

---

## 6. Database Migration

Two new tables created:
- `slates` - User-curated themed collections
- `albums` - Simple photo collections

Both tables have RLS policies and are already deployed to production Supabase.

---

## 7. Future Enhancements

Potential additions:
- **Album sharing** - Public albums get shareable links
- **Slate templates** - Pre-built slate types (Wedding, Baby's First Year, etc.)
- **Smart album customization** - Users can create their own smart album rules
- **Export to PDF** - Print-quality albums
- **Collaborative albums** - Family members can add to shared albums

---

## 8. Technical Notes

### File Structure
```
src/app/(vault)/vault/
├── slates/
│   ├── page.tsx          (list view)
│   ├── new/page.tsx      (create form)
│   └── [id]/page.tsx     (detail view)
├── albums/
│   ├── page.tsx          (list + smart albums)
│   ├── new/page.tsx      (create form)
│   └── [id]/page.tsx     (detail view)
└── smart/
    └── [slug]/page.tsx   (smart album detail)
```

### Key Components
- `VaultSidebar` - Updated navigation
- `MemoryCard` - Reused for all album/slate grids
- `ArweaveBadge` - Shows permanent storage status
- `PermanentViewerButton` - Generate shareable permanent links

### API Pattern
- All API routes use `createAdminClient()` for database access
- RLS policies enforce user ownership at the database level
- Service layer (`SlateService`, `AlbumService`) handles business logic
- Repositories (`SupabaseSlateRepository`, `SupabaseAlbumRepository`) handle data access

---

## 9. Deployment

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `NEXT_PUBLIC_AO_PROCESS_ID` ✓
- `NEXT_PUBLIC_AO_VIEWER_TX_ID` ✓
- `STRIPE_SECRET_KEY` (for billing)
- `POSTMARK_API_KEY` (for emails)
- `OPENAI_API_KEY` (for AI analysis)

### Database
Migration already applied:
- `slates` table with RLS
- `albums` table with RLS
- RPC helpers for memory array operations

### Next Steps
1. Deploy to Vercel
2. Test with real data
3. Verify RLS policies work correctly
4. Test smart album filtering with diverse photos

---

**Status:** ✅ Build passing  
**Commit:** 3fd2c97  
**Pushed:** To GitHub main branch  
**Database:** Migration complete on production Supabase
