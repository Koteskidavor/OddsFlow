import { visitApp } from './helpers';

describe('Bet slip toggling & market validation', () => {
  beforeEach(() => {
    visitApp();
    cy.get('[data-cy="match-card"]').first().should('be.visible');
  });

  it('toggles a selection off when the same odds button is clicked twice', () => {
    cy.get('[data-cy="odds-button"]').first().click();
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
    cy.get('[data-cy="odds-button"]').first().should('have.class', 'is-selected');
    cy.get('[data-cy="slip-teams"]').should('contain.text', 'Real Madrid vs Barcelona');

    cy.get('[data-cy="odds-button"]').first().click();
    cy.get('[data-cy="slip-count"]').should('not.exist');
    cy.get('[data-cy="odds-button"]').first().should('not.have.class', 'is-selected');
    cy.get('[data-cy="slip-empty"]').should('be.visible');
    cy.get('[data-cy="slip-total-stake"]').should('not.exist');
    cy.get('[data-cy="slip-total-payout"]').should('not.exist');
  });

  it('blocks void (0-odds) markets like Draw in basketball and tennis', () => {
    // Soccer supports a three-way market: the Draw button is priced and selectable.
    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(1).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
    cy.get('[data-cy="slip-remove"]').click();
    cy.get('[data-cy="slip-empty"]').should('be.visible');

    // Basketball Draw is void (0) and must never add a selection.
    cy.get('[data-cy="sport-tab-basketball"]').click();
    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(1).find('.value').should('have.text', '0');
    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(1).click();
    cy.get('[data-cy="slip-count"]').should('not.exist');
    cy.get('[data-cy="slip-empty"]').should('be.visible');
    cy.get('[data-cy="slip-total-stake"]').should('not.exist');

    // Tennis Draw is also void.
    cy.get('[data-cy="sport-tab-tennis"]').click();
    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(1).find('.value').should('have.text', '0');
    cy.get('[data-cy="match-card"]').eq(0).find('[data-cy="odds-button"]').eq(1).click();
    cy.get('[data-cy="slip-count"]').should('not.exist');
    cy.get('[data-cy="slip-empty"]').should('be.visible');
  });
});