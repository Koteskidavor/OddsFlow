import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrendInfo } from '../../../../core/models/odds-trend.model';

@Component({
  selector: 'app-odds-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (flash of [flashState()]; track flash.key) {
      <div
        class="content"
        [class.flash-up]="flash.direction === 'up' && flash.key > 0"
        [class.flash-down]="flash.direction === 'down' && flash.key > 0"
      >
        <span class="value">{{ value() }}</span>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      cursor: pointer;
      user-select: none;
    }

    .content {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .content.flash-up {
      animation: flash-green 0.6s ease-out;
    }

    .content.flash-down {
      animation: flash-red 0.6s ease-out;
    }

    .value {
      font-family: monospace;
    }

    @keyframes flash-green {
      0% { background-color: #dcfce7; color: #166534; }
      100% { background-color: #f8f9fa; color: inherit; }
    }

    @keyframes flash-red {
      0% { background-color: #fee2e2; color: #991b1b; }
      100% { background-color: #f8f9fa; color: inherit; }
    }
  `]
})
export class OddsButtonComponent {
  value = input.required<number | string>();
  trend = input.required<TrendInfo>();

  protected readonly flashState = computed(() => ({
    key: this.trend().timestamp,
    direction: this.trend().direction
  }));
}