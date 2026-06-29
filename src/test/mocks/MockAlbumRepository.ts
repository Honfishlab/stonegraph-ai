/**
 * Mock AlbumRepository for testing
 */

import type { Album } from "@/domain/entities";
import type { AlbumRepository } from "@/domain/repositories/album-repository";

export class MockAlbumRepository implements AlbumRepository {
  private albums: Album[] = [];

  async findById(id: string): Promise<Album | null> {
    return this.albums.find((a) => a.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Album[]> {
    return this.albums.filter((a) => a.userId === userId);
  }

  async create(album: Album): Promise<Album> {
    this.albums.push(album);
    return album;
  }

  async update(id: string, updates: Partial<Album>): Promise<Album> {
    const album = this.albums.find((a) => a.id === id);
    if (!album) throw new Error("Album not found");
    Object.assign(album, updates);
    return album;
  }

  async delete(id: string): Promise<void> {
    this.albums = this.albums.filter((a) => a.id !== id);
  }
}
