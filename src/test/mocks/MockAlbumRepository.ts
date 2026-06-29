/**
 * Mock AlbumRepository for testing
 */

import type { Album } from "@/domain/entities";
import type { AlbumRepository } from "@/domain/repositories/album-repository";

export class MockAlbumRepository implements AlbumRepository {
  private albums: Album[] = [];

  async getById(id: string): Promise<Album | null> {
    return this.albums.find((a) => a.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Album | null> {
    return this.albums.find((a) => a.slug === slug) || null;
  }

  async listByUserId(userId: string): Promise<Album[]> {
    return this.albums.filter((a) => a.user_id === userId);
  }

  async create(album: Omit<Album, "id" | "created_at" | "updated_at">): Promise<Album> {
    const full: Album = {
      ...album,
      id: `test-album-${this.albums.length + 1}`,
      slug: album.slug || `test-album-${Date.now()}`,
      memory_ids: album.memory_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.albums.push(full);
    return full;
  }

  async update(id: string, updates: Partial<Album>): Promise<Album> {
    const album = this.albums.find((a) => a.id === id);
    if (!album) throw new Error(`Album ${id} not found`);
    Object.assign(album, updates, { updated_at: new Date().toISOString() });
    return album;
  }

  async delete(id: string): Promise<void> {
    this.albums = this.albums.filter((a) => a.id !== id);
  }

  reset(): void {
    this.albums = [];
  }

  get count(): number {
    return this.albums.length;
  }
}
