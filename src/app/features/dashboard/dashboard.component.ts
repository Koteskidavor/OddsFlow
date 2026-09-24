import { Component, signal, computed, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { MatchesStore } from '../../core/services/matches.store';
import { BetSlipStore } from '../../core/services/bet-slip.store';
import { MatchCardComponent } from './components/match-card/match-card.component';
import { MatchCardSkeletonComponent } from './components/match-card-skeleton/match-card-skeleton.component';
import { BetSlipComponent } from '../bet-slip/bet-slip.component';
import { SportType } from '../../core/models/match.model';

@Component({
  selector: 'app-dashboard',
  imports: [TitleCasePipe, MatchCardComponent, MatchCardSkeletonComponent, BetSlipComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
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