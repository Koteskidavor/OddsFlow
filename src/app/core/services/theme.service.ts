import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { SafeStorageService } from './safe-storage.service';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'oddsfeed-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(SafeStorageService);
  private readonly destroyRef = inject(DestroyRef);

  /** A stored value represents an explicit user choice, never the OS default. */
  private readonly storedChoice = this.readStoredChoice();
  private savedChoice: Theme | null = this.storedChoice;

  private readonly media = this.systemMedia();

  private readonly onSystemChange = (event: MediaQueryListEvent): void => {
    // A user choice outranks the OS preference; otherwise keep following it.
    if (this.savedChoice) return;
    this._theme.set(event.matches ? 'dark' : 'light');
    this.applyTheme(this._theme());
  };

  private readonly _theme = signal<Theme>(this.savedChoice ?? this.systemTheme());

  public readonly theme = this._theme.asReadonly();
  public readonly isDark = computed(() => this._theme() === 'dark');
  public readonly label = computed(() =>
    this.isDark() ? 'Switch to light theme' : 'Switch to dark theme'
  );

  constructor() {
    this.applyTheme(this._theme());

    // Without a stored user choice, keep following the OS preference live.
    if (!this.savedChoice && this.media) {
      this.media.addEventListener('change', this.onSystemChange);
      this.destroyRef.onDestroy(() =>
        this.media?.removeEventListener('change', this.onSystemChange)
      );
    }
  }

  toggle(): void {
    const next: Theme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(next);
    this.applyTheme(next);
    this.storage.set(STORAGE_KEY, next);
    this.savedChoice = next;
  }

  private readStoredChoice(): Theme | null {
    const stored = this.storage.get(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  }

  private systemMedia(): MediaQueryList | null {
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  }

  private systemTheme(): Theme {
    return this.systemMedia()?.matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}