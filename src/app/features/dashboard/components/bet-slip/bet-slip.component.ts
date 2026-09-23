import { Component, computed, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BetSlipStore, slipKey } from '../../../../core/services/bet-slip.store';
import { MatchesStore } from '../../../../core/services/matches.store';

@Component({
  selector: 'app-bet-slip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `
    <div class="bet-slip">
      <header class="slot-header">
        <div class="slot-title-row">
          <h2 class="slot-title">Bet Slip</h2>
          @if (items().length > 0) {
            <span class="slot-count" aria-label="Total selections">{{ items().length }}</span>
          }
        </div>
        <button class="slot-close" type="button" (click)="close.emit()" aria-label="Close bet slip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      @if (items().length === 0) {
        <div class="slot-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8L4 7z"></path>
            <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path>
          </svg>
          <p class="slot-empty-title">Your bet slip is empty</p>
          <p class="slot-empty-hint">Tap an odds button on any match to add it here.</p>
        </div>
      } @else {
        <ul class="slot-list" aria-label="Selections">
          @for (row of rows(); track row.key) {
            <li class="slot-row">
              <div class="slot-row-top">
                <span class="slot-teams">{{ row.home }} vs {{ row.away }}</span>
                <button
                  class="slot-remove"
                  type="button"
                  [attr.aria-label]="'Remove ' + row.home + ' vs ' + row.away + ' ' + row.selection"
                  (click)="remove(row.matchId, row.selection)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  </svg>
                </button>
              </div>
              <div class="slot-row-meta">
                <span class="slot-selection">Selection {{ row.selection }}</span>
                <span class="slot-odds">{{ row.odds | currency: 'EUR' : 'symbol' : '1.2-3' }}</span>
              </div>
              <div class="slot-row-inputs">
                <label class="slot-stake">
                  <span class="slot-stake-label">Stake</span>
                  <input
                    class="slot-stake-input"
                    type="number"
                    min="0"
                    step="0.5"
                    [value]="row.stake"
                    (change)="updateStake(row.matchId, row.selection, $event)"
                  />
                </label>
                <span class="slot-payout">
                  Potential payout
                  <strong>{{ row.potentialPayout | currency: 'EUR' : 'symbol' : '1.2' }}</strong>
                </span>
              </div>
            </li>
          }
        </ul>

        <footer class="slot-footer">
          <div class="slot-totals">
            <div class="slot-total-row">
              <span>Total stake</span>
              <span>{{ totalStake() | currency: 'EUR' : 'symbol' : '1.2' }}</span>
            </div>
            <div class="slot-total-row slot-total-payout">
              <span>Potential payout</span>
              <span>{{ totalPayout() | currency: 'EUR' : 'symbol' : '1.2' }}</span>
            </div>
          </div>
          <button class="slot-place" type="button" (click)="placeBet()">Place Bet</button>
        </footer>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 100%;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .bet-slip {
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 100%;
      height: 100%;
      width: 100%;
      background: var(--surface);
      overflow: hidden;
    }

    .slot-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-alt);
    }

    .slot-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slot-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }

    .slot-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      background: var(--accent);
      color: var(--text-on-accent);
      font-size: 12px;
      font-weight: 700;
    }

    .slot-close {
      display: none;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        background: var(--border);
        color: var(--text);
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .slot-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 40px 24px;
      text-align: center;
      color: var(--text-muted);
      flex: 1;

      svg {
        width: 44px;
        height: 44px;
        margin-bottom: 8px;
        opacity: 0.6;
      }
    }

    .slot-empty-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .slot-empty-hint {
      margin: 0;
      font-size: 13px;
    }

    .slot-list {
      list-style: none;
      margin: 0;
      padding: 12px 16px;
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }

    .slot-row {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }
    }

    .slot-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .slot-teams {
      font-size: 13px;
      font-weight: 600;
    }

    .slot-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        background: var(--down-bg);
        color: var(--down-text);
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .slot-row-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 4px 0;
    }

    .slot-selection {
      font-size: 12px;
      color: var(--text-muted);
    }

    .slot-odds {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
    }

    .slot-row-inputs {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
    }

    .slot-stake {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slot-stake-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .slot-stake-input {
      width: 96px;
      padding: 7px 10px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface-alt);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 0;
        border-color: var(--accent);
      }
    }

    .slot-payout {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 11px;
      color: var(--text-muted);

      strong {
        color: var(--text);
        font-size: 14px;
      }
    }

    .slot-footer {
      flex-shrink: 0;
      padding: 14px 16px;
      border-top: 1px solid var(--border);
      background: var(--surface-alt);
    }

    .slot-totals {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .slot-total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-muted);

      span:last-child {
        font-weight: 600;
        color: var(--text);
      }
    }

    .slot-total-payout span:last-child {
      color: var(--up-text);
      font-weight: 700;
    }

    .slot-place {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: var(--text-on-accent);
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--accent-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    }

    @media (max-width: 859.98px) {
      .slot-close {
        display: inline-flex;
      }
    }
  `]
})
export class BetSlipComponent {
  private readonly betSlipStore = inject(BetSlipStore);
  private readonly matchesStore = inject(MatchesStore);

  readonly close = output<void>();

  protected readonly items = this.betSlipStore.items;

  protected readonly totalStake = this.betSlipStore.totalStake;
  protected readonly totalPayout = this.betSlipStore.totalPayout;

  protected readonly rows = computed(() => {
    const matches = this.matchesStore.matches();
    return this.betSlipStore.items().map(item => {
      const match = matches.find(m => m.id === item.matchId);
      return {
        key: slipKey(item.matchId, item.selection),
        matchId: item.matchId,
        selection: item.selection,
        odds: item.odds,
        stake: item.stake,
        potentialPayout: item.potentialPayout,
        home: match?.homeTeam ?? '?',
        away: match?.awayTeam ?? '?'
      };
    });
  });

  protected remove(matchId: string, selection: string) {
    this.betSlipStore.removeSelection(matchId, selection);
  }

  protected updateStake(matchId: string, selection: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const stake = Math.max(0, Number(input.value) || 0);
    this.betSlipStore.updateStake(matchId, selection, stake);
  }

  protected placeBet() {
    this.betSlipStore.clear();
  }
}