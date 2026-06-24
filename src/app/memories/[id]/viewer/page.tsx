'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { permanentViewer } from '@/lib/permanent-viewer';

interface MemoryData {
  id: string;
  title: string;
  description: string;
  storage_status: string;
  arweave_tx_id?: string;
  tags?: string[];
  storage_path?: string;
}

export default function MemoryViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const txParam = searchParams.get('tx');
  
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const id = params.id as string;
  const memoryId = id.replace(/-/g, '');

  useEffect(() => {
    async function loadMemory() {
      try {
        setLoading(true);
        setError(null);

        // First try to get memory from database
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/memories/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Memory not found');
          }
          throw new Error('Failed to load memory');
        }

        const data = await response.json();
        setMemory(data);

        // Get image URL from storage
        if (data.storage_path) {
          const { createClient } = await import('@/infrastructure/database/client');
          const supabase = createClient();
          
          const { data: urlData } = await supabase.storage
            .from('memories')
            .createSignedUrl(data.storage_path, 3600);
          
          if (urlData) {
            setImageUrl(urlData.signedUrl);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load memory');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadMemory();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-stone-600">Loading memory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❓</div>
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-stone-600">This memory does not exist</p>
        </div>
      </div>
    );
  }

  const viewerUrl = memory.arweave_tx_id 
    ? permanentViewer.getMemoryViewerUrl(memory.arweave_tx_id)
    : null;
  const directArweaveUrl = memory.arweave_tx_id
    ? permanentViewer.getDirectArweaveUrl(memory.arweave_tx_id)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{memory.title}</h1>
              <p className="text-stone-600 mt-1">ID: {memoryId}</p>
            </div>
            {memory.storage_status === 'permanent' && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="font-medium">Permanent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Image Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={memory.title}
              className="w-full object-contain max-h-[600px]"
            />
          ) : (
            <div className="bg-stone-100 h-96 flex items-center justify-center">
              <div className="text-center text-stone-400">
                <div className="text-6xl mb-4">🖼️</div>
                <p>No preview available</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {memory.description && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Description</h2>
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
              {memory.description}
            </p>
          </div>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {memory.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Arweave Information */}
        {memory.arweave_tx_id && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Arweave Storage</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-stone-600 mb-1">Transaction ID</p>
                <p className="font-mono text-sm text-stone-900 bg-stone-50 p-3 rounded border border-stone-200 break-all">
                  {memory.arweave_tx_id}
                </p>
              </div>

              {viewerUrl && (
                <div>
                  <p className="text-sm font-medium text-stone-600 mb-1">Permanent Viewer URL</p>
                  <a 
                    href={viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700 underline break-all text-sm bg-blue-50 p-3 rounded border border-blue-200"
                  >
                    {viewerUrl}
                  </a>
                </div>
              )}

              {directArweaveUrl && (
                <div>
                  <p className="text-sm font-medium text-stone-600 mb-1">Direct Arweave URL</p>
                  <a 
                    href={directArweaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700 underline break-all text-sm bg-stone-50 p-3 rounded border border-stone-200"
                  >
                    {directArweaveUrl}
                  </a>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {viewerUrl && (
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
                  >
                    Open Viewer
                  </a>
                )}
                {directArweaveUrl && (
                  <a
                    href={directArweaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-stone-600 hover:bg-stone-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
                  >
                    View on Arweave
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Memory Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-stone-600">Status</p>
              <p className="text-stone-900 capitalize">{memory.storage_status}</p>
            </div>
            
            {memory.storage_path && (
              <div>
                <p className="text-sm font-medium text-stone-600">Storage Path</p>
                <p className="font-mono text-xs text-stone-900 bg-stone-50 p-2 rounded border border-stone-200 break-all">
                  {memory.storage_path}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a 
            href="/memories"
            className="inline-block text-stone-600 hover:text-stone-900 transition-colors"
          >
            ← Back to Memories
          </a>
        </div>
      </div>
    </div>
  );
}
