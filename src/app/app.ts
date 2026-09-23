import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LiveEventService } from './core/services/live-event.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly liveEventService = inject(LiveEventService);
  protected readonly title = signal('OddsFlow');

  constructor() {
    this.liveEventService.events$.subscribe(event => {
      console.log('Live Event Received:', event);
    });
  }
}
