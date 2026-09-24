import { Component, computed, inject, output } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { BetSlipStore, slipKey, MAX_STAKE_CENTS, toCents } from '../../core/services/bet-slip.store';
import { MatchesStore } from '../../core/services/matches.store';

@Component({
  selector: 'app-bet-slip',
  imports: [CurrencyPipe, DecimalPipe],
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

  protected readonly maxStakeEuros = MAX_STAKE_CENTS / 100;

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
    const cents = toCents(Number(input.value));
    const applied = this.betSlipStore.updateStake(matchId, selection, cents);
    if (applied !== null) {
      input.value = String(applied / 100);
    }
  }

  protected placeBet() {
    this.betSlipStore.clear();
  }
}