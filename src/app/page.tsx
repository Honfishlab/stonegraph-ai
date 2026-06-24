import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        {/* Hero */}
        <div className="space-y-6">
          <h1 className="text-6xl font-serif font-bold tracking-tight text-stone-900">
            Your memories,
            <br />
            <span className="text-stone-600">permanent.</span>
            <br />
            <span className="text-stone-400">Forever.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            Store your photos, videos, and family memories permanently on the
            Arweave permaweb. Guaranteed to survive forever on the blockchain.
          </p>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="px-8 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
          >
            Create your free vault
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 border-2 border-stone-300 text-stone-700 rounded-lg hover:border-stone-400 transition-colors font-medium"
          >
            See pricing
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 pt-12">
          <div className="space-y-3">
            <div className="text-4xl">🔒</div>
            <h3 className="text-xl font-semibold text-stone-900">
              Permanent by design
            </h3>
            <p className="text-stone-600">
              Stored on the Arweave permaweb. Not backed up. Not synced.
              Permanently written to the blockchain and verifiable by anyone, forever.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">🤖</div>
            <h3 className="text-xl font-semibold text-stone-900">
              AI-powered organization
            </h3>
            <p className="text-stone-600">
              Automatically connects your photos, people, dates, and heirlooms
              into a living knowledge graph of your family's story.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-semibold text-stone-900">
              Yours to inherit
            </h3>
            <p className="text-stone-600">
              Designate who inherits your vault. Your memories transfer to the
              people you choose — no recurring fees required for them to access
              what you've preserved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 text-sm text-stone-500">
          Powered by Arweave · Built for permanence, not convenience
        </div>
      </div>
    </main>
  );
}
