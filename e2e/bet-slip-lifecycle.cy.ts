import { visitApp } from './helpers';

describe('Bet slip lifecycle', () => {
  beforeEach(() => {
    visitApp();
    cy.get('[data-cy="match-card"]').first().should('be.visible');
  });

  it('survives repeated empty -> filled -> empty cycles without ghost state', () => {
    for (let i = 0; i < 3; i++) {
      cy.get('[data-cy="odds-button"]').eq(0).click();
      cy.get('[data-cy="slip-count"]').should('have.text', '1');
      cy.get('[data-cy="slip-place"]').click();
      cy.get('[data-cy="slip-empty"]').should('be.visible');
      cy.get('[data-cy="slip-count"]').should('not.exist');
      cy.get('[data-cy="slip-total-stake"]').should('not.exist');
      cy.get('[data-cy="slip-total-payout"]').should('not.exist');
    }

    // One more cycle using the row remove button instead of Place Bet.
    cy.get('[data-cy="odds-button"]').eq(1).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
    cy.get('[data-cy="slip-remove"]').click();
    cy.get('[data-cy="slip-empty"]').should('be.visible');
    cy.get('[data-cy="slip-count"]').should('not.exist');
  });

  it('clears the whole slip when Place Bet is clicked', () => {
    cy.get('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="odds-button"]').eq(1).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '2');

    cy.get('[data-cy="slip-place"]').click();
    cy.get('[data-cy="slip-empty"]').should('be.visible');
    cy.get('[data-cy="slip-count"]').should('not.exist');
    cy.get('[data-cy="slip-total-stake"]').should('not.exist');
    cy.get('[data-cy="slip-total-payout"]').should('not.exist');
  });

  it('keeps slip selections while switching sport tabs', () => {
    cy.get('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '1');

    cy.get('[data-cy="sport-tab-tennis"]').click();
    cy.get('[data-cy="match-card"]').should('have.length', 2);
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
    cy.get('[data-cy="slip-teams"]').should('contain.text', 'Real Madrid vs Barcelona');

    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '2');

    cy.get('[data-cy="sport-tab-soccer"]').click();
    cy.get('[data-cy="slip-count"]').should('have.text', '2');
    cy.get('[data-cy="slip-teams"]').should('have.length', 2);
  });
});