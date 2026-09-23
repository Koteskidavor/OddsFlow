import { visitApp, parseEur, formatEur, round2 } from './helpers';

describe('Bet slip flow', () => {
  beforeEach(() => {
    visitApp();
    cy.get('[data-cy="match-card"]').first().should('be.visible');
  });

  it('adds selections, computes payouts from live odds, and removes them', () => {
    // Add two markets of the first match.
    cy.get('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="odds-button"]').eq(1).click();

    cy.get('[data-cy="slip-count"]').should('have.text', '2');
    cy.get('[data-cy="slip-row"]').should('have.length', 2);
    cy.get('[data-cy="slip-teams"]').first().should('contain.text', 'Real Madrid vs Barcelona');

    // Read the frozen odds directly from the slip rows. BetSlipStore snapshots
    // the odds on add, so these values never change during the test — reading
    // them here removes any dependency on hardcoded odds.
    cy.get('[data-cy="slip-odds"]').then($odds => {
      const oddsA = parseEur($odds.eq(0).text());
      const oddsB = parseEur($odds.eq(1).text());

      expect(oddsA).to.be.greaterThan(0);
      expect(oddsB).to.be.greaterThan(0);

      const stakeA = 50;
      const stakeB = 75;
      const expectedPayoutA = round2(oddsA * stakeA);
      const expectedPayoutB = round2(oddsB * stakeB);

      // Enter stakes -> payout fields and totals must match the math.
      cy.get('[data-cy="slip-stake-input"]').eq(0).clear().type(String(stakeA)).blur();
      cy.get('[data-cy="slip-stake-input"]').eq(1).clear().type(String(stakeB)).blur();

      cy.get('[data-cy="slip-row-payout"]').eq(0).should('contain.text', formatEur(expectedPayoutA));
      cy.get('[data-cy="slip-row-payout"]').eq(1).should('contain.text', formatEur(expectedPayoutB));
      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(stakeA + stakeB));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(round2(expectedPayoutA + expectedPayoutB)));

      // Remove the first selection -> totals update to the remaining row.
      cy.get('[data-cy="slip-remove"]').eq(0).click();
      cy.get('[data-cy="slip-count"]').should('have.text', '1');
      cy.get('[data-cy="slip-row"]').should('have.length', 1);
      cy.get('[data-cy="slip-total-stake"]').should('have.text', formatEur(stakeB));
      cy.get('[data-cy="slip-total-payout"]').should('have.text', formatEur(expectedPayoutB));

      // Remove the last selection -> slip resets to empty.
      cy.get('[data-cy="slip-remove"]').click();
      cy.get('[data-cy="slip-empty"]').should('be.visible');
      cy.get('[data-cy="slip-total-stake"]').should('not.exist');
      cy.get('[data-cy="slip-total-payout"]').should('not.exist');
    });
  });
});