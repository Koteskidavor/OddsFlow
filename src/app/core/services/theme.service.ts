import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'oddsfeed-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _theme = signal<Theme>(this.getStoredOrPreferredTheme());

  public readonly theme = this._theme.asReadonly();
  public readonly isDark = computed(() => this._theme() === 'dark');
  public readonly label = computed(() =>
    this.isDark() ? 'Switch to light theme' : 'Switch to dark theme'
  );

  constructor() {
    this.applyTheme(this._theme());
  }

  toggle(): void {
    const next: Theme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(next);
    this.applyTheme(next);
  }

  private getStoredOrPreferredTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'light';

    try {
      const stored = this.document.defaultView?.localStorage?.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // storage unavailable (e.g. private mode) — fall through to preference
    }

    const prefersDark =
      this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore storage write failures
      }
    }
  }
}