import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";

export const dynamic = "force-dynamic";

// Smart Albums generated from AI analysis — these are "live" views, not stored DB rows
interface SmartAlbum {
  id: string;
  title: string;
  description: string;
  icon: string;
  predicate: (memory: any) => boolean;
}

const SMART_ALBUMS: SmartAlbum[] = [
  {
    id: "outdoor",
    title: "Outdoor",
    description: "Photos taken outside",
    icon: "🌳",
    predicate: (m: any) =>
      m.ai_scene_type?.toLowerCase().includes("outdoor") ||
      m.ai_tags?.some((t: string) =>
        ["nature", "park", "garden", "forest", "beach", "mountain"].includes(t.toLowerCase())
      ),
  },
  {
    id: "family",
    title: "Family Moments",
    description: "Memories shared with family",
    icon: "👨‍👩‍👧‍👦",
    predicate: (m: any) =>
      m.ai_face_labels?.some((l: string) =>
        ["mother", "father", "daughter", "son", "brother", "sister"].includes(l.toLowerCase())
      ) ||
      m.ai_subjects?.some((s: string) => s.toLowerCase().includes("family")),
  },
  {
    id: "travel",
    title: "Travel",
    description: "Photos from trips and adventures",
    icon: "✈️",
    predicate: (m: any) =>
      m.ai_scene_type?.toLowerCase().includes("travel") ||
      m.ai_tags?.some((t: string) =>
        ["travel", "vacation", "hotel", "airport", "tourism"].includes(t.toLowerCase())
      ) ||
      (m.exif_location !== null && m.exif_location !== ""),
  },
  {
    id: "celebration",
    title: "Celebrations",
    description: "Birthdays, holidays, special events",
    icon: "🎉",
    predicate: (m: any) =>
      m.ai_scene_type?.toLowerCase().includes("celebration") ||
      m.ai_tags?.some((t: string) =>
        ["birthday", "party", "wedding", "holiday", "christmas", "celebration"].includes(
          t.toLowerCase()
        )
      ),
  },
  {
    id: "food",
    title: "Food & Drinks",
    description: "Culinary memories",
    icon: "🍽️",
    predicate: (m: any) =>
      m.ai_subjects?.some((s: string) =>
        ["food", "drink", "meal", "dish", "recipe", "restaurant"].includes(s.toLowerCase())
      ),
  },
  {
    id: "nature",
    title: "Nature",
    description: "Plants, animals, landscapes",
    icon: "🌺",
    predicate: (m: any) =>
      m.ai_tags?.some((t: string) =>
        ["plant", "flower", "tree", "animal", "bird", "landscape"].includes(t.toLowerCase())
      ) ||
      m.ai_scene_type?.toLowerCase().includes("nature"),
  },
  {
    id: "night",
    title: "Nighttime",
    description: "Photos captured after dark",
    icon: "🌙",
    predicate: (m: any) => m.ai_time_of_day?.toLowerCase() === "night" || m.ai_time_of_day?.toLowerCase() === "evening",
  },
  {
    id: "indoor",
    title: "Indoor",
    description: "Photos taken inside",
    icon: "🏠",
    predicate: (m: any) => m.ai_scene_type?.toLowerCase().includes("indoor"),
  },
  {
    id: "people",
    title: "People",
    description: "Portraits and group photos",
    icon: "🤝",
    predicate: (m: any) => (m.ai_faces_detected ?? 0) > 0,
  },
  {
    id: "animals",
    title: "Animals & Pets",
    description: "Furry friends and wildlife",
    icon: "🐾",
    predicate: (m: any) =>
      m.ai_subjects?.some((s: string) =>
        ["dog", "cat", "bird", "horse", "pet", "animal"].includes(s.toLowerCase())
      ),
  },
];

export default async function AlbumsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  const familyRepo = new SupabaseFamilyRepository();
  const family = await familyRepo.getUserFamily(user.id);
  if (!family) redirect("/vault");

  const memoryRepo = new SupabaseMemoryRepository();
  const memories = await memoryRepo.list({ familyId: family.id, limit: 500 });

  const { data: albums } = await supabase
    .from("albums")
    .select("*")
    .eq("family_id", family.id)
    .order("updated_at", { ascending: false });

  // Build smart album counts
  const smartAlbumResults = SMART_ALBUMS.map((album) => ({
    ...album,
    memoryCount: memories.filter(album.predicate).length,
  })).filter((a) => a.memoryCount > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Albums</h1>
          <p className="text-stone-600 mt-1">Your collections — manual and AI-curated</p>
        </div>
        <a
          href="/vault/albums/new"
          className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
        >
          + New Album
        </a>
      </div>

      {/* Smart Albums — AI-generated */}
      {smartAlbumResults.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-stone-800">Smart Albums</h2>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              ✨ AI-curated
            </span>
          </div>
          <p className="text-sm text-stone-500 mb-4">
            Automatically generated from your photos using AI analysis.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {smartAlbumResults.map((album) => (
              <a
                key={album.id}
                href={`/vault/smart/${album.id}`}
                className="group block bg-white rounded-lg shadow-sm border border-stone-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-2">{album.icon}</div>
                <h3 className="font-semibold text-stone-900 text-sm">{album.title}</h3>
                <p className="text-xs text-stone-500 mt-1">{album.memoryCount} photos</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* User-created Albums */}
      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-4">My Albums</h2>
        {albums && albums.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album: any) => {
              const cover = album.cover_memory_id
                ? memories.find(
                    (m: any) => m.id === album.cover_memory_id
                  )
                : null;
              const thumb = cover?.arweave_tx_id
                ? `https://arweave.net/${cover.arweave_tx_id}`
                : null;

              return (
                <a
                  key={album.id}
                  href={`/vault/albums/${album.id}`}
                  className="group block bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-stone-100 relative">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                        📸
                      </div>
                    )}
                    {album.is_public && (
                      <div className="absolute top-2 right-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Public
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-stone-900 text-sm truncate">
                      {album.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {album.memory_ids?.length || 0} memories
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
            <div className="text-4xl mb-3">📸</div>
            <p className="text-stone-600 mb-4">
              No custom albums yet. Create one to organize your memories.
            </p>
            <a
              href="/vault/albums/new"
              className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
              Create your first album
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
