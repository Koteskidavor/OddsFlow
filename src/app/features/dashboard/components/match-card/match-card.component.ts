import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchTrend } from '../../../../core/services/matches.store';
import { OddsSelection } from '../../../../core/models/match.model';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule],
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
          @if (match().sport === 'tennis') {
            <span class="score">{{ match().tennisScore?.currentSet?.home || '0' }}</span>
          } @else if (match().score) {
            <span class="score">{{ getScorePart(0) }}</span>
          }
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="name">{{ match().awayTeam }}</span>
          @if (match().sport === 'tennis') {
            <span class="score">{{ match().tennisScore?.currentSet?.away || '0' }}</span>
          } @else if (match().score) {
            <span class="score">{{ getScorePart(1) }}</span>
          }
        </div>
      </div>

      @if (match().sport === 'tennis' && match().tennisScore) {
        <div class="tennis-sets">
          Sets: {{ match().tennisScore?.setsWon?.home }} - {{ match().tennisScore?.setsWon?.away }}
          <div class="set-history">
            @for (set of match().tennisScore?.sets; track $index) {
              <span class="set-score">{{ set.home }}-{{ set.away }}</span>
            }
          </div>
        </div>
      }

      <div class="odds-grid">
        @for (selection of ['1', 'X', '2']; track selection) {
          <div class="odds-item">
            <span class="label">{{ selection }}</span>
            <span class="value" [class]="match().trends[selection] || 'neutral'">
              {{ getOddValue(selection) }}
            </span>
          </div>
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
      .odds-item {
        background: #f8f9fa;
        padding: 8px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        .label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .value { 
          font-weight: 700; 
          font-size: 14px;
          &.up { color: #10b981; }
          &.down { color: #ef4444; }
          &.neutral { color: #333; }
        }
      }
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

  getScorePart(index: number): string {
    return this.match().score?.split('-')[index] || '0';
  }

  getOddValue(selection: string): string | number {
    return this.match().odds[selection as OddsSelection] || 'N/A';
  }
}
