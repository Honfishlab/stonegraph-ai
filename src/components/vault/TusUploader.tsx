"use client";

import { useState, useRef } from "react";
import { Upload } from "tus-js-client";
import type { MemoryType } from "@/domain/entities";

interface TusUploaderProps {
  familyId: string;
  onUploaded?: () => void;
}

interface TusFileConfig {
  memoryType: MemoryType;
  title: string;
  description?: string;
}

export default function TusUploader({ familyId, onUploaded }: TusUploaderProps) {
  const [files, setFiles] = useState<Array<{
    id: string;
    file: File;
    upload?: any;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    config: TusFileConfig;
  }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const,
      config: {
        memoryType: file.type.startsWith('video/') ? 'video' as const :
                   file.type.startsWith('image/') ? 'photo' as const :
                   file.type.startsWith('audio/') ? 'document' as const : 'document' as const,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      },
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const updateFileConfig = (fileId: string, updates: Partial<TusFileConfig>) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, config: { ...f.config, ...updates } } : f
      )
    );
  };

  const uploadFile = async (fileId: string) => {
    const fileEntry = files.find((f) => f.id === fileId);
    if (!fileEntry) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
      )
    );

    try {
      const metadata = {
        filename: fileEntry.file.name,
        filetype: fileEntry.file.type,
        familyId,
        type: fileEntry.config.memoryType,
        title: fileEntry.config.title,
        description: fileEntry.config.description || '',
      };

      const upload = new Upload(fileEntry.file, {
        endpoint: '/api/upload/tus',
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata,
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        onError: (error) => {
          console.error('Upload failed:', error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: 'error' } : f
            )
          );
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const progress = (bytesUploaded / bytesTotal) * 100;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, progress } : f
            )
          );
        },
        onSuccess: () => {
          console.log('Upload successful:', metadata.filename);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: 'success', progress: 100 } : f
            )
          );
          onUploaded?.();
        },
      });

      // Check for previous upload
      const previousUpload = await upload.findPreviousUploads();
      if (previousUpload.length > 0) {
        upload.resumeFromPreviousUpload(previousUpload[0]);
      }

      upload.start();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, upload } : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'error' } : f
        )
      );
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-6">
      {/* File input */}
      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-6 py-12 border-2 border-dashed border-stone-300 rounded-lg hover:border-stone-400 transition-colors"
        >
          <p className="text-stone-600">
            Click to select or drag and drop files
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Supports any file size up to your storage limit
          </p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-stone-900">
            Files ({files.length})
          </h3>

          {files.map((fileEntry) => (
            <div
              key={fileEntry.id}
              className="border border-stone-200 rounded-lg p-4 space-y-3"
            >
              {/* File info */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-stone-900">
                    {fileEntry.file.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {(fileEntry.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(fileEntry.id)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ×
                </button>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Type
                  </label>
                  <select
                    value={fileEntry.config.memoryType}
                    onChange={(e) =>
                      updateFileConfig(fileEntry.id, {
                        memoryType: e.target.value as MemoryType,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    disabled={fileEntry.status !== 'pending'}
                  >
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                    <option value="heirloom">Heirloom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={fileEntry.config.title}
                    onChange={(e) =>
                      updateFileConfig(fileEntry.id, { title: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    disabled={fileEntry.status !== 'pending'}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={fileEntry.config.description || ''}
                  onChange={(e) =>
                    updateFileConfig(fileEntry.id, {
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  disabled={fileEntry.status !== 'pending'}
                />
              </div>

              {/* Progress */}
              {fileEntry.status === 'uploading' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                    <span>Uploading...</span>
                    <span>{fileEntry.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2">
                    <div
                      className="bg-stone-900 h-2 rounded-full transition-all"
                      style={{ width: `${fileEntry.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between">
                <p
                  className={`text-sm ${
                    fileEntry.status === 'error'
                      ? 'text-red-600'
                      : fileEntry.status === 'success'
                      ? 'text-green-600'
                      : 'text-stone-600'
                  }`}
                >
                  {fileEntry.status === 'pending'
                    ? 'Ready to upload'
                    : fileEntry.status === 'uploading'
                    ? 'Uploading...'
                    : fileEntry.status === 'success'
                    ? 'Success!'
                    : 'Failed'}
                </p>

                {fileEntry.status === 'pending' && (
                  <button
                    onClick={() => uploadFile(fileEntry.id)}
                    className="px-4 py-1.5 bg-stone-900 text-white rounded text-sm hover:bg-stone-800 transition-colors"
                  >
                    Upload
                  </button>
                )}

                {fileEntry.status === 'error' && (
                  <button
                    onClick={() => uploadFile(fileEntry.id)}
                    className="px-4 py-1.5 bg-stone-900 text-white rounded text-sm hover:bg-stone-800 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function getAuthToken(): Promise<string> {
  // Get auth token from Supabase
  const { createClient } = await import('@/infrastructure/database/client');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}
