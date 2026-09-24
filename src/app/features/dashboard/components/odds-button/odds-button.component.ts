import { Component, input, computed, output } from '@angular/core';
import { TrendInfo } from '../../../../core/models/odds-trend.model';
import { OddsSelection } from '../../../../core/models/match.model';

@Component({
  selector: 'app-odds-button',
  templateUrl: './odds-button.component.html',
  styleUrl: './odds-button.component.scss'
})
export class OddsButtonComponent {
  value = input.required<number | string>();
  trend = input.required<TrendInfo>();
  selection = input.required<OddsSelection>();
  selected = input(false);
  picked = output<OddsSelection>();

  protected readonly flashState = computed(() => ({
    key: this.trend().timestamp,
    direction: this.trend().direction
  }));
}