import { Component, input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatchTrend } from '../../../../core/services/matches.store';
import { OddsSelection } from '../../../../core/models/match.model';
import { BetSlipStore } from '../../../../core/services/bet-slip.store';
import { OddsButtonComponent } from '../odds-button/odds-button.component';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [OddsButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="match-card" [attr.aria-label]="match().homeTeam + ' vs ' + match().awayTeam">
      <div class="header">
        <span class="sport">{{ match().sport }}</span>
        @if (match().status === 'live') {
          <span class="live-indicator">
            <span class="pulse"></span> LIVE
          </span>
        }
      </div>

      <div class="teams">
        <div class="team">
          <span class="name">{{ match().homeTeam }}</span>
          <span class="score">{{ homeScore() }}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="name">{{ match().awayTeam }}</span>
          <span class="score">{{ awayScore() }}</span>
        </div>
      </div>

      @if (match().sport === 'tennis' && match().tennisScore) {
        <div class="tennis-sets">
          <span>Sets: {{ match().tennisScore?.setsWon?.home }} - {{ match().tennisScore?.setsWon?.away }}</span>
          <div class="set-history">
            @for (set of sets(); track $index) {
              <span class="set-score">{{ set.home }}-{{ set.away }}</span>
            }
          </div>
        </div>
      }

      <div class="odds-grid">
        @for (odd of oddsList(); track odd.selection) {
          <app-odds-button
            [value]="odd.value"
            [trend]="odd.trend"
            [selection]="odd.selection"
            [selected]="odd.selected"
            (picked)="onPick(odd.selection)"
          />
        }
      </div>
    </article>
  `,
  styles: [`
    .match-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .sport {
        font-size: 12px;
        text-transform: uppercase;
        color: var(--text-muted);
        font-weight: 600;
      }
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--live);

      .pulse {
        width: 8px;
        height: 8px;
        background: var(--live);
        border-radius: 50%;
        animation: pulse-animation 1.5s infinite;
      }
    }

    .teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      .team {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex: 1;

        .name {
          font-weight: 600;
          font-size: 16px;
          text-align: center;
        }

        .score {
          font-size: 24px;
          font-weight: 800;
          color: var(--text);
        }
      }

      .vs {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 700;
      }
    }

    .odds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .tennis-sets {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 12px;

      .set-history {
        display: flex;
        gap: 6px;

        .set-score {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }
      }
    }

    @keyframes pulse-animation {
      0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--live) 70%, transparent); }
      70% { box-shadow: 0 0 0 10px transparent; }
      100% { box-shadow: 0 0 0 0 transparent; }
    }
  `]
})
export class MatchCardComponent {
  match = input.required<MatchTrend>();

  private readonly betSlipStore = inject(BetSlipStore);

  protected readonly homeScore = computed(() => {
    const m = this.match();
    if (m.sport === 'tennis') return m.tennisScore?.currentSet?.home || '0';
    return m.score?.split('-')[0] || '0';
  });

  protected readonly awayScore = computed(() => {
    const m = this.match();
    if (m.sport === 'tennis') return m.tennisScore?.currentSet?.away || '0';
    return m.score?.split('-')[1] || '0';
  });

  protected readonly sets = computed(() => this.match().tennisScore?.sets ?? []);

  protected readonly oddsList = computed(() => {
    const m = this.match();
    return (['1', 'X', '2'] as const).map(selection => ({
      selection,
      value: m.odds[selection as OddsSelection] ?? 'N/A',
      trend: m.trends[selection] ?? { direction: 'neutral', timestamp: 0 },
      selected: this.betSlipStore.hasSelection(m.id, selection)
    }));
  });

  protected onPick(selection: OddsSelection) {
    const m = this.match();
    const odds = m.odds[selection as OddsSelection];
    if (!(odds > 0)) return;

    const stake = 10;
    this.betSlipStore.toggleSelection({
      matchId: m.id,
      selection,
      odds,
      stake,
      potentialPayout: Number((stake * odds).toFixed(2))
    });
  }
}