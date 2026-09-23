import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-match-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-card" aria-hidden="true">
      <div class="sk-header sk"></div>
      <div class="sk-row">
        <div class="sk sk-name"></div>
        <div class="sk sk-vs"></div>
        <div class="sk sk-name"></div>
      </div>
      <div class="sk-odds-grid">
        <div class="sk sk-odds"></div>
        <div class="sk sk-odds"></div>
        <div class="sk sk-odds"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow-sm);
    }

    .sk {
      background: linear-gradient(
        90deg,
        var(--skeleton) 25%,
        var(--skeleton-shine) 50%,
        var(--skeleton) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 6px;
    }

    .sk-header {
      width: 80px;
      height: 12px;
      margin-bottom: 20px;
    }

    .sk-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 24px;
    }

    .sk-name {
      height: 18px;
      flex: 1;
      max-width: 120px;
    }

    .sk-vs {
      width: 24px;
      height: 12px;
    }

    .sk-odds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .sk-odds {
      height: 36px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class MatchCardSkeletonComponent {}