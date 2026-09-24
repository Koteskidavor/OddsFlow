import { visitApp } from './helpers';

describe('Loading state and live odds integration', () => {
  it('shows a skeleton and aria-live status during a controllable load, then real content', () => {
    visitApp('?sim=off&loadMs=3000');

    cy.get('[role="status"]').should('contain.text', 'Loading matches...');
    cy.get('.matches-column').should('have.attr', 'aria-busy', 'true');
    cy.get('.skeleton-card').should('have.length', 3);
    cy.get('[data-cy="match-card"]').should('not.exist');

    cy.get('[role="status"]').should('contain.text', '2 matches loaded');
    cy.get('.matches-column').should('have.attr', 'aria-busy', 'false');
    cy.get('.skeleton-card').should('not.exist');
    cy.get('[data-cy="match-card"]').should('have.length', 2);
  });

  it('keeps slip totals frozen on the odds snapshot while live cards keep updating', () => {
    visitApp('');

    // Pin Math.random to 0.1 so the first simulation tick is fully
    // deterministic: it always emits ODDS_UPDATE for the first live match
    // (m1, soccer) on selection '1', to newOdds = 1.50. No real-time flakiness.
    cy.window().then(win => {
      cy.stub(win.Math, 'random').returns(0.1);
    });

    cy.get('[data-cy="match-card"]').first().should('be.visible');

    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).find('.value')
      .invoke('text')
      .then(initial => {
        expect(parseFloat(initial)).to.equal(2.1);

        // Add the snapshot (m1, selection '1', odds 2.1, default stake 10).
        cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).click();
        cy.get('[data-cy="slip-count"]').should('have.text', '1');
        cy.get('[data-cy="slip-odds"]').should('have.text', '2.10');
        cy.get('[data-cy="slip-total-stake"]').should('have.text', '€10.00');
        cy.get('[data-cy="slip-total-payout"]').should('have.text', '€21.00');

        // The sim fires every 2500ms; Cypress retries until the card reflects 1.50.
        cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).find('.value')
          .should('have.text', '1.5');

        // The slip snapshot and totals must be untouched by the live update.
        cy.get('[data-cy="slip-odds"]').should('have.text', '2.10');
        cy.get('[data-cy="slip-total-stake"]').should('have.text', '€10.00');
        cy.get('[data-cy="slip-total-payout"]').should('have.text', '€21.00');
      });
  });
});