import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatchTrend } from '../../../../core/services/matches.store';
import { OddsSelection } from '../../../../core/models/match.model';
import { OddsButtonComponent } from '../odds-button/odds-button.component';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [OddsButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="match-card">
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
          Sets: {{ match().tennisScore?.setsWon?.home }} - {{ match().tennisScore?.setsWon?.away }}
          <div class="set-history">
            @for (set of sets(); track $index) {
              <span class="set-score">{{ set.home }}-{{ set.away }}</span>
            }
          </div>
        </div>
      }

      <div class="odds-grid">
        @for (odd of oddsList(); track odd.selection) {
          <app-odds-button [value]="odd.value" [trend]="odd.trend" />
        }
      </div>
    </div>
  `,
  styles: [`
    .match-card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #eee;
      margin-bottom: 16px;
      transition: transform 0.2s ease;
      &:hover { transform: translateY(-2px); }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      .sport {
        font-size: 12px;
        text-transform: uppercase;
        color: #888;
        font-weight: 600;
      }
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #ef4444;
      .pulse {
        width: 8px;
        height: 8px;
        background: #ef4444;
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
        .name { font-weight: 600; font-size: 16px; }
        .score { 
          font-size: 24px; 
          font-weight: 800; 
          color: #111; 
        }
      }
      .vs {
        font-size: 12px;
        color: #aaa;
        font-weight: 700;
      }
    }

    .odds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .tennis-sets {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
      .set-history {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
        .set-score {
          background: #eee;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }
      }
    }

    @keyframes pulse-animation {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  `]
})
export class MatchCardComponent {
  match = input.required<MatchTrend>();

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
      trend: m.trends[selection] ?? { direction: 'neutral', timestamp: 0 }
    }));
  });
}
