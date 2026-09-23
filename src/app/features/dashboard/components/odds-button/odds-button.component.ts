import { Component, input, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { TrendInfo } from '../../../../core/models/odds-trend.model';
import { OddsSelection } from '../../../../core/models/match.model';

@Component({
  selector: 'app-odds-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="odds-btn"
      [class.is-selected]="selected()"
      [attr.aria-pressed]="selected()"
      [attr.aria-label]="'Select ' + selection() + ' at ' + value()"
      (click)="picked.emit(selection())"
    >
      @for (flash of [flashState()]; track flash.key) {
        <span
          class="content"
          [class.flash-up]="flash.direction === 'up' && flash.key > 0"
          [class.flash-down]="flash.direction === 'down' && flash.key > 0"
        >
          <span class="value">{{ value() }}</span>
        </span>
      }
    </button>
  `,
  styles: [`
    :host {
      display: block;
    }

    .odds-btn {
      display: block;
      width: 100%;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-alt);
      color: var(--text);
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;

      &:hover {
        border-color: var(--accent);
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      &.is-selected {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--text-on-accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);

        .content {
          animation: none;
          background: transparent;
          color: inherit;
        }
      }
    }

    .content {
      display: block;
      padding: 8px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      border-radius: calc(var(--radius-sm) - 2px);
      background: var(--surface-alt);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .content.flash-up {
      animation: flash-up 0.6s ease-out;
    }

    .content.flash-down {
      animation: flash-down 0.6s ease-out;
    }

    .value {
      font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace;
    }

    @keyframes flash-up {
      0% { background-color: var(--up-bg); color: var(--up-text); }
      100% { background-color: transparent; color: inherit; }
    }

    @keyframes flash-down {
      0% { background-color: var(--down-bg); color: var(--down-text); }
      100% { background-color: transparent; color: inherit; }
    }
  `]
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