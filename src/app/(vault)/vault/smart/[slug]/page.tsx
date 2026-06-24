import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import MemoryCard from "@/components/vault/MemoryCard";

export const dynamic = "force-dynamic";

const SMART_ALBUMS: Record<string, { title: string; description: string; icon: string; predicate: (m: any) => boolean }> = {
  outdoor: { title: "Outdoor", description: "Photos taken outside", icon: "🌳", predicate: (m: any) => m.ai_scene_type?.toLowerCase().includes("outdoor") || m.ai_tags?.some((t: string) => ["nature","park","garden","forest","beach","mountain"].includes(t.toLowerCase())) },
  family: { title: "Family Moments", description: "Memories shared with family", icon: "👨‍👩‍👧‍👦", predicate: (m: any) => m.ai_face_labels?.some((l: string) => ["mother","father","daughter","son","brother","sister"].includes(l.toLowerCase())) || m.ai_subjects?.some((s: string) => s.toLowerCase().includes("family")) },
  travel: { title: "Travel", description: "Photos from trips and adventures", icon: "✈️", predicate: (m: any) => m.ai_tags?.some((t: string) => ["travel","vacation","hotel","airport","tourism"].includes(t.toLowerCase())) || (!!m.exif_location && m.exif_location !== "") },
  celebration: { title: "Celebrations", description: "Birthdays, holidays, special events", icon: "🎉", predicate: (m: any) => m.ai_tags?.some((t: string) => ["birthday","party","wedding","holiday","christmas","celebration"].includes(t.toLowerCase())) },
  food: { title: "Food & Drinks", description: "Culinary memories", icon: "🍽️", predicate: (m: any) => m.ai_subjects?.some((s: string) => ["food","drink","meal","dish","recipe","restaurant"].includes(s.toLowerCase())) },
  nature: { title: "Nature", description: "Plants, animals, landscapes", icon: "🌺", predicate: (m: any) => m.ai_tags?.some((t: string) => ["plant","flower","tree","animal","bird","landscape"].includes(t.toLowerCase())) },
  night: { title: "Nighttime", description: "Photos captured after dark", icon: "🌙", predicate: (m: any) => ["night","evening"].includes(m.ai_time_of_day?.toLowerCase() ?? "") },
  indoor: { title: "Indoor", description: "Photos taken inside", icon: "🏠", predicate: (m: any) => m.ai_scene_type?.toLowerCase().includes("indoor") },
  people: { title: "People", description: "Portraits and group photos", icon: "🤝", predicate: (m: any) => (m.ai_faces_detected ?? 0) > 0 },
  animals: { title: "Animals & Pets", description: "Furry friends and wildlife", icon: "🐾", predicate: (m: any) => m.ai_subjects?.some((s: string) => ["dog","cat","bird","horse","pet","animal"].includes(s.toLowerCase())) },
};

export default async function SmartAlbumDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = SMART_ALBUMS[slug];
  if (!album) {
    return (
      <div className="space-y-4">
        <a href="/vault/albums" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to albums
        </a>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">❓</div>
          <p className="text-stone-600">Unknown smart album.</p>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const familyRepo = new SupabaseFamilyRepository();
  const family = await familyRepo.getUserFamily(user.id);
  if (!family) redirect("/vault");

  const memoryRepo = new SupabaseMemoryRepository();
  const memories = await memoryRepo.list({ familyId: family.id, limit: 500 });
  const matching = memories.filter(album.predicate);

  return (
    <div className="space-y-6">
      <a href="/vault/albums" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to albums
      </a>

      <div className="flex items-center gap-3">
        <span className="text-4xl">{album.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-stone-900">{album.title}</h1>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              ✨ AI-curated
            </span>
          </div>
          <p className="text-stone-600 mt-1">
            {album.description} • {matching.length} {matching.length === 1 ? "memory" : "memories"}
          </p>
        </div>
      </div>

      {matching.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">{album.icon}</div>
          <p className="text-stone-600">
            No memories match this smart album yet. Upload more photos and the AI will analyze them automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {matching.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </div>
  );
}
