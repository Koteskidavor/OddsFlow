import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchesStore } from '../../core/services/matches.store';
import { MatchCardComponent } from './components/match-card/match-card.component';
import { SportType } from '../../core/models/match.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatchCardComponent],
  template: `
    <div class="dashboard-container">
      <header class="tabs-header">
        @for (sport of sports; track sport) {
          <button 
            class="tab-btn" 
            [class.active]="activeSport() === sport"
            (click)="setActiveSport(sport)"
          >
            {{ sport | titlecase }}
          </button>
        }
      </header>

      <main class="matches-list">
        @if (filteredMatches().length > 0) {
          @for (match of filteredMatches(); track match.id) {
            <app-match-card [match]="match" />
          }
        } @else {
          <div class="empty-state">
            No matches available for this sport.
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .tabs-header {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 10px;
      margin-bottom: 24px;
      border-bottom: 1px solid #eee;
      
      .tab-btn {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid #ddd;
        background: #fff;
        cursor: pointer;
        white-space: nowrap;
        font-weight: 500;
        transition: all 0.2s ease;

        &.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        &:hover:not(.active) {
          background: #f8f9fa;
        }
      }
    }

    .matches-list {
      display: grid;
      gap: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #888;
      font-style: italic;
    }
  `]
})
export class DashboardComponent {
  private readonly matchesStore = inject(MatchesStore);
  
  protected readonly sports: SportType[] = ['soccer', 'basketball', 'tennis', 'esports'];
  protected readonly activeSport = signal<SportType>('soccer');

  protected readonly filteredMatches = computed(() => {
    const sport = this.activeSport();
    return this.matchesStore.getMatchesBySport(sport);
  });

  setActiveSport(sport: SportType) {
    this.activeSport.set(sport);
  }
}
