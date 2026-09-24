import { Component, input, computed, inject } from '@angular/core';
import { MatchTrend } from '../../../../core/services/matches.store';
import { OddsSelection } from '../../../../core/models/match.model';
import { BetSlipStore } from '../../../../core/services/bet-slip.store';
import { OddsButtonComponent } from '../odds-button/odds-button.component';

@Component({
  selector: 'app-match-card',
  imports: [OddsButtonComponent],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.scss'
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
      value: m.odds[selection] ?? 'N/A',
      trend: m.trends[selection] ?? { direction: 'neutral', timestamp: 0 },
      selected: this.betSlipStore.hasSelection(m.id, selection)
    }));
  });

  protected onPick(selection: OddsSelection) {
    const m = this.match();
    const odds = m.odds[selection];
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