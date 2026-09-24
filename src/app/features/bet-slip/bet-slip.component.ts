import { Component, computed, inject, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BetSlipStore, slipKey } from '../../core/services/bet-slip.store';
import { MatchesStore } from '../../core/services/matches.store';

@Component({
  selector: 'app-bet-slip',
  imports: [CurrencyPipe],
  templateUrl: './bet-slip.component.html',
  styleUrl: './bet-slip.component.scss'
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