import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { MatchesStore } from '../../core/services/matches.store';
import { BetSlipStore } from '../../core/services/bet-slip.store';
import { MatchCardComponent } from './components/match-card/match-card.component';
import { MatchCardSkeletonComponent } from './components/match-card-skeleton/match-card-skeleton.component';
import { BetSlipComponent } from './components/bet-slip/bet-slip.component';
import { SportType } from '../../core/models/match.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TitleCasePipe, MatchCardComponent, MatchCardSkeletonComponent, BetSlipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <header class="tabs-header">
        @for (sport of sports; track sport) {
          <button
            class="tab-btn"
            [attr.data-cy]="'sport-tab-' + sport"
            [class.active]="activeSport() === sport"
            (click)="setActiveSport(sport)"
          >
            {{ sport | titlecase }}
          </button>
        }
      </header>

      <div class="layout">
        <main class="matches-column" [attr.aria-busy]="matchesStore.loading()">
          <div class="sr-only" role="status" aria-live="polite">
            @if (matchesStore.loading()) {
              <span>Loading matches...</span>
            } @else {
              <span>{{ filteredMatches().length }} matches loaded</span>
            }
          </div>

          @if (matchesStore.loading()) {
            @for (skeleton of skeletonCount; track skeleton) {
              <app-match-card-skeleton />
            }
          } @else if (filteredMatches().length > 0) {
            @for (match of filteredMatches(); track match.id) {
              <app-match-card [match]="match" />
            }
          } @else {
            <div class="empty-state">
              <p class="empty-title">No matches available</p>
              <p class="empty-hint">There are no {{ activeSport() | titlecase }} matches right now.</p>
            </div>
          }
        </main>

        <aside class="slip-column" [class.is-open]="slipOpen()">
          <app-bet-slip (close)="slipOpen.set(false)" />
        </aside>

        @if (slipOpen()) {
          <button class="slip-backdrop" type="button" (click)="slipOpen.set(false)" aria-label="Close bet slip"></button>
        }
      </div>

      <button
        class="slip-fab"
        type="button"
        (click)="slipOpen.set(true)"
        [attr.aria-expanded]="slipOpen()"
        [attr.aria-label]="'Open bet slip, ' + betSlipStore.items().length + ' selections'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8L4 7z"></path>
          <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>Bet Slip</span>
        @if (betSlipStore.items().length > 0) {
          <span class="slip-fab-count">{{ betSlipStore.items().length }}</span>
        }
      </button>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 20px;
      padding-bottom: 96px;
    }

    .tabs-header {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 10px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);

      .tab-btn {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
        white-space: nowrap;
        font-weight: 500;
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;

        &.active {
          background: var(--accent);
          color: var(--text-on-accent);
          border-color: var(--accent);
        }

        &:hover:not(.active) {
          background: var(--surface-alt);
        }

        &:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      }
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      align-items: start;
    }

    .matches-column {
      display: grid;
      gap: 16px;
      min-width: 0;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);

      .empty-title {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text);
      }

      .empty-hint {
        margin: 0;
        color: var(--text-muted);
        font-size: 14px;
      }
    }

    .slip-column {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 50vh;
      max-height: 50dvh;
    }

    .slip-backdrop {
      position: fixed;
      inset: 0;
      z-index: 45;
      border: none;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      cursor: pointer;
    }

    .slip-fab {
      display: none;
    }

    @media (min-width: 860px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) 360px;
      }

      .slip-column {
        position: sticky;
        top: 84px;
        max-height: 50vh;
        max-height: 50dvh;
        display: flex;
        flex-direction: column;
      }
    }

    @media (max-width: 859.98px) {
      .slip-column {
        position: fixed;
        left: 0;
        right: 0;
        width: 100% !important;
        bottom: 0;
        z-index: 50;
        max-height: 50vh;
        max-height: 50dvh;
        transform: translateY(105%);
        transition: transform 0.28s ease;
        border-radius: var(--radius) var(--radius) 0 0;
        border-inline: none;
        box-shadow: var(--shadow-drawer);
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;

        &.is-open {
          transform: translateY(0);
        }
      }

      .slip-backdrop {
        display: block;
      }

      .slip-fab {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 44;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        border: none;
        border-radius: 999px;
        background: var(--accent);
        color: var(--text-on-accent);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: var(--shadow-md);
        transition: background-color 0.2s ease;

        &:hover {
          background: var(--accent-hover);
        }

        &:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .slip-fab-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background: var(--text-on-accent);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
      }
    }
  `]
})
export class DashboardComponent {
  protected readonly matchesStore = inject(MatchesStore);
  protected readonly betSlipStore = inject(BetSlipStore);

  protected readonly sports: SportType[] = ['soccer', 'basketball', 'tennis', 'esports'];
  protected readonly activeSport = signal<SportType>('soccer');
  protected readonly slipOpen = signal(false);
  protected readonly skeletonCount = [0, 1, 2];

  protected readonly filteredMatches = computed(() => {
    const sport = this.activeSport();
    return this.matchesStore.getMatchesBySport(sport);
  });

  protected setActiveSport(sport: SportType) {
    this.activeSport.set(sport);
    this.slipOpen.set(false);
  }
}