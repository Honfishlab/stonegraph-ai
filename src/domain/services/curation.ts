/**
 * My Slate service — curates featured memories into themed collections
 * Albums service — creates custom photo collections
 */

import type { Slate, UpdateSlate, CreateSlate } from "@/domain/entities";
import type { SlateRepository } from "@/domain/repositories";
import type { Album, UpdateAlbum, CreateAlbum } from "@/domain/entities";
import type { AlbumRepository } from "@/domain/repositories";
import { SupabaseSlateRepository } from "@/infrastructure/repositories";
import { SupabaseAlbumRepository } from "@/infrastructure/repositories";

export class SlateService {
  private repo: SlateRepository;

  constructor(repo?: SlateRepository) {
    this.repo = repo || new SupabaseSlateRepository();
  }

  async getById(id: string): Promise<Slate | null> {
    return await this.repo.getById(id);
  }

  async listByUser(userId: string): Promise<Slate[]> {
    return await this.repo.listByUser(userId);
  }

  async listByFamily(familyId: string): Promise<Slate[]> {
    return await this.repo.listByFamily(familyId);
  }

  async create(input: CreateSlate): Promise<Slate> {
    return await this.repo.create({
      ...input,
      memory_ids: input.memory_ids ?? [],
    });
  }

  async update(id: string, updates: UpdateSlate): Promise<Slate> {
    return await this.repo.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async addMemoriesToSlate(slateId: string, memoryIds: string[]): Promise<Slate> {
    await this.repo.addMemories(slateId, memoryIds);
    const slate = await this.getById(slateId);
    if (!slate) {
      throw new Error(`Slate ${slateId} not found after adding memories`);
    }
    return slate;
  }

  async removeMemoriesFromSlate(slateId: string, memoryIds: string[]): Promise<void> {
    await this.repo.removeMemories(slateId, memoryIds);
  }

  async reorderMemories(slateId: string, memoryIds: string[]): Promise<void> {
    await this.repo.reorderMemories(slateId, memoryIds);
  }
}

export class AlbumService {
  private repo: AlbumRepository;

  constructor(repo?: AlbumRepository) {
    this.repo = repo || new SupabaseAlbumRepository();
  }

  async getById(id: string): Promise<Album | null> {
    return await this.repo.getById(id);
  }

  async listByFamily(familyId: string, includePublic?: boolean): Promise<Album[]> {
    return await this.repo.listByFamily(familyId, includePublic);
  }

  async listPublic(): Promise<Album[]> {
    return await this.repo.listPublic();
  }

  async create(input: CreateAlbum): Promise<Album> {
    return await this.repo.create({
      ...input,
      memory_ids: input.memory_ids ?? [],
    });
  }

  async update(id: string, updates: UpdateAlbum): Promise<Album> {
    return await this.repo.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async addMemoriesToAlbum(albumId: string, memoryIds: string[]): Promise<Album> {
    await this.repo.addMemories(albumId, memoryIds);
    const album = await this.getById(albumId);
    if (!album) {
      throw new Error(`Album ${albumId} not found after adding memories`);
    }
    return album;
  }

  async removeMemoriesFromAlbum(albumId: string, memoryIds: string[]): Promise<void> {
    await this.repo.removeMemories(albumId, memoryIds);
  }

  async reorderMemories(albumId: string, memoryIds: string[]): Promise<void> {
    await this.repo.reorderMemories(albumId, memoryIds);
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    return await this.repo.isSlugAvailable(slug);
  }
}
