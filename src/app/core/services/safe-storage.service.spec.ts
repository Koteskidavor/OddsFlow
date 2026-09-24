import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { SafeStorageService } from './safe-storage.service';

class FakeStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class ThrowingStorage implements Storage {
  get length(): number {
    throw new Error('storage denied');
  }

  clear(): void {
    throw new Error('storage denied');
  }

  getItem(): string | null {
    throw new Error('storage denied');
  }

  key(): string | null {
    throw new Error('storage denied');
  }

  removeItem(): void {
    throw new Error('storage denied');
  }

  setItem(): void {
    throw new Error('storage denied');
  }
}

function createDocument(storage: Storage | null): Document {
  return {
    defaultView: { localStorage: storage }
  } as unknown as Document;
}

describe('SafeStorageService', () => {
  let storage: FakeStorage;
  let service: SafeStorageService;

  function configure(document: Document): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: document }]
    });
    service = TestBed.inject(SafeStorageService);
  }

  beforeEach(() => {
    storage = new FakeStorage();
    configure(createDocument(storage));
  });

  it('reads a previously stored value', () => {
    storage.setItem('key', 'value');

    expect(service.get('key')).toBe('value');
  });

  it('returns null for a missing key', () => {
    expect(service.get('missing')).toBeNull();
  });

  it('persists a value on set', () => {
    expect(service.set('key', 'value')).toBe(true);
    expect(storage.getItem('key')).toBe('value');
  });

  it('removes a stored value', () => {
    storage.setItem('key', 'value');

    expect(service.remove('key')).toBe(true);
    expect(storage.getItem('key')).toBeNull();
  });

  describe('when no storage is available', () => {
    beforeEach(() => {
      configure(createDocument(null));
    });

    it('returns null on get', () => {
      expect(service.get('key')).toBeNull();
    });

    it('reports failure on set and remove', () => {
      expect(service.set('key', 'value')).toBe(false);
      expect(service.remove('key')).toBe(false);
    });
  });

  describe('when storage access throws', () => {
    beforeEach(() => {
      configure(createDocument(new ThrowingStorage()));
    });

    it('returns null on get', () => {
      expect(service.get('key')).toBeNull();
    });

    it('reports failure on set and remove', () => {
      expect(service.set('key', 'value')).toBe(false);
      expect(service.remove('key')).toBe(false);
    });

    it('still reports success accurately for a working store afterwards', () => {
      configure(createDocument(storage));

      expect(service.set('key', 'value')).toBe(true);
    });
  });
});