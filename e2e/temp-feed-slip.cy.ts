import { visitApp } from './helpers';

describe('TEMP feed-vs-slip investigation', () => {
  it('slip survives a feed of pure ODDS_UPDATE events', () => {
    cy.clock();
    cy.visit('/');
    cy.tick(900);
    cy.get('[data-cy="match-card"]').should('have.length', 2);

    // Force every 2.5s tick to be an ODDS_UPDATE (rand < 0.7).
    cy.window().then(win => {
      cy.stub(win.Math, 'random').returns(0.1);
    });

    // Add all 3 selections of the first (live soccer) card.
    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').each($b => {
      cy.wrap($b).click();
    });
    cy.get('[data-cy="slip-count"]').should('have.text', '3');

    for (let i = 0; i < 5; i++) {
      cy.tick(2500);
      cy.get('[data-cy="slip-count"]').should('have.text', '3');
    }
    cy.get('[data-cy="slip-teams"]').should('have.length', 3);
  });

  it('slip row is evicted only when its match gets STATUS_CHANGE to finished', () => {
    cy.clock();
    cy.visit('/');
    cy.tick(900);
    cy.get('[data-cy="match-card"]').should('have.length', 2);

    // rand >= 0.94 => STATUS_CHANGE (m1 finishes).
    cy.window().then(win => {
      cy.stub(win.Math, 'random').returns(0.99);
    });

    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '1');

    cy.tick(2500);

    cy.get('[data-cy="slip-empty"]').should('be.visible');
    cy.get('[data-cy="slip-count"]').should('not.exist');
  });

  it('finish of one match does not clear selections on other live matches', () => {
    cy.clock();
    cy.visit('/');
    cy.tick(900);
    cy.get('[data-cy="match-card"]').should('have.length', 2);

    // First tick: STATUS_CHANGE finishes m1.
    let calls = 0;
    cy.window().then(win => {
      cy.stub(win.Math, 'random').callsFake(() => {
        calls++;
        return calls <= 2 ? 0.99 : 0.1;
      });
    });

    // Selection on m1 (first card) and the second displayed card.
    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="match-card"]').eq(1).find('[data-cy="odds-button"]').eq(0).click();
    cy.get('[data-cy="slip-count"]').should('have.text', '2');

    cy.tick(2500); // m1 finishes
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
  });
});