export function visitApp(query: string = '?sim=off'): void {
  // `sim=off` pauses the real-time odds/score simulation (LiveEventService)
  // so tests are deterministic and free of data-driven flakiness.
  // `loadMs` extends the skeleton/loading phase for loading-state assertions.
  cy.visit(`/${query}`);
}

// Parses a currency-formatted value ("€2.10" -> 2.1).
export function parseEur(text: string): number {
  return Number(text.replace(/[^\d.-]/g, ''));
}

// Matches Angular's currency pipe (EUR, symbol, 2 decimals).
export function formatEur(value: number): string {
  return '€' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Mirrors BetSlipStore's payout rounding: Number((stake * odds).toFixed(2)).
export function round2(value: number): number {
  return Number(value.toFixed(2));
}