import { visitApp } from './helpers';

describe('Responsive bet slip drawer', () => {
  beforeEach(() => {
    cy.viewport(375, 700);
    visitApp();
    cy.get('[data-cy="match-card"]').first().should('be.visible');
  });

  it('uses a floating button + bottom drawer on mobile, with working close actions', () => {
    cy.get('.slip-fab').should('be.visible');
    cy.get('.slip-backdrop').should('not.exist');
    cy.get('.slip-column').should('not.have.class', 'is-open');

    cy.get('[data-cy="odds-button"]').eq(0).click();
    cy.get('.slip-fab-count').should('have.text', '1');

    cy.get('.slip-fab').click();
    cy.get('.slip-column').should('have.class', 'is-open');
    cy.get('.slip-backdrop').should('be.visible');

    cy.get('.slot-close').click();
    cy.get('.slip-column').should('not.have.class', 'is-open');
    cy.get('.slip-backdrop').should('not.exist');

    cy.get('.slip-fab').click();
    cy.get('.slip-column').should('have.class', 'is-open');
    cy.get('.slip-backdrop').click('top');
    cy.get('.slip-column').should('not.have.class', 'is-open');
    cy.get('.slip-backdrop').should('not.exist');
  });
});