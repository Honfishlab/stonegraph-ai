import VaultSidebar from "@/components/vault/VaultSidebar";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <VaultSidebar />
      <main className="ml-56 min-h-screen p-8">{children}</main>
    </div>
  );
}
