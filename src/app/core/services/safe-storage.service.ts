import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SafeStorageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  get(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      const storage = this.storage;
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      const storage = this.storage;
      if (!storage) return false;
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  private get storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.document.defaultView?.localStorage ?? null;
  }
}