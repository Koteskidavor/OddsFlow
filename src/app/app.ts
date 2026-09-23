import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LiveEventService } from './core/services/live-event.service';
import { MatchesStore } from './core/services/matches.store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly liveEventService = inject(LiveEventService);
  protected readonly matchesStore = inject(MatchesStore);
  protected readonly title = signal('OddsFlow');

  constructor() {
    this.liveEventService.events$.subscribe(event => {
      console.log('Live Event Received:', event);
    });
  }
}
