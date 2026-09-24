import { visitApp, parseEur, formatEur, round2 } from './helpers';

describe('Bet slip totals stress', () => {
  beforeEach(() => {
    visitApp();
    cy.get('[data-cy="match-card"]').first().should('be.visible');
  });

  it('keeps payout math exact for decimal stakes and caps stakes at the maximum', () => {
    cy.get('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="slip-odds"]').invoke('text').then(slipRaw => {
      const odds = parseEur(slipRaw);

      const decimalStake = 12.5;
      cy.get('[data-cy="slip-stake-input"]').first().clear().type(String(decimalStake)).blur();
      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(decimalStake));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(round2(odds * decimalStake)));
      cy.get('[data-cy="slip-row-payout"]').first().should('contain.text', formatEur(round2(odds * decimalStake)));

      const largeStake = 99999.99;
      cy.get('[data-cy="slip-stake-input"]').first().clear().type(String(largeStake)).blur();
      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(largeStake));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(round2(odds * largeStake)));
      cy.get('[data-cy="slip-row-payout"]').first().should('contain.text', formatEur(round2(odds * largeStake)));

      // Anything above the €100,000 ceiling is clamped, never propagated raw.
      cy.get('[data-cy="slip-stake-input"]').first().clear().type('999999999').blur();
      cy.get('[data-cy="slip-stake-input"]').first().should('have.value', '100000');
      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(100000));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(round2(odds * 100000)));
      cy.get('[data-cy="slip-row-payout"]').first().should('contain.text', formatEur(round2(odds * 100000)));
    });
  });

  it('keeps totals exact and the list scrollable with six selections', () => {
    // Add all 6 soccer markets (2 matches x 3) — default stake 10 each.
    cy.get('[data-cy="match-card"]').each($card => {
      cy.wrap($card).find('[data-cy="odds-button"]').each($btn => {
        cy.wrap($btn).click();
      });
    });

    cy.get('[data-cy="slip-count"]').should('have.text', '6');
    cy.get('[data-cy="slip-row"]').should('have.length', 6);

    cy.get('[data-cy="slip-list"]').should($list => {
      const el = $list[0];
      expect(el.scrollHeight).to.be.greaterThan(el.clientHeight);
    });

    cy.get('[data-cy="slip-odds"]').then($odds => {
      let expectedPayout = 0;
      $odds.each((_i, el) => {
        expectedPayout += round2(parseEur(el.textContent || '') * 10);
      });

      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(60));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(round2(expectedPayout)));
    });
  });
});