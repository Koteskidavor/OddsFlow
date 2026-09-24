import { Injectable, computed, inject, signal } from '@angular/core';
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

  private readonly _theme = signal<Theme>(this.getPreferredTheme());

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

  private getPreferredTheme(): Theme {
    const stored = this.storage.get(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;

    const prefersDark =
      this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
    this.storage.set(STORAGE_KEY, theme);
  }
}