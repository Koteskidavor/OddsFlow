import { visitApp } from './helpers';

describe('TEMP feed-vs-slip investigation', () => {
  // cy.clock() freezes Angular's render-scheduling timers too, so the DOM does
  // not refresh after an interaction until the clock advances. tick(1) flushes
  // the rendered update before asserting on it.
  const flush = () => cy.tick(1);

  it('slip survives a feed of pure ODDS_UPDATE events', () => {
    cy.clock();
    cy.visit('/');
    cy.tick(900);
    cy.get('[data-cy="match-card"]').should('have.length', 2);

    // Force every 2.5s tick to be an ODDS_UPDATE (rand < 0.7).
    cy.window().then(win => {
      cy.stub(win.Math, 'random').returns(0.1);
    });

    const firstCard = () => cy.get('[data-cy="match-card"]').first();
    firstCard().find('[data-cy="odds-button"]').eq(0).click();
    flush();
    firstCard().find('[data-cy="odds-button"]').eq(1).click();
    flush();
    firstCard().find('[data-cy="odds-button"]').eq(2).click();
    flush();
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

    // First random draw picks the match index (0 -> m1); the second (>= 0.99)
    // is the STATUS_CHANGE that finishes it.
    let calls = 0;
    cy.window().then(win => {
      cy.stub(win.Math, 'random').callsFake(() => {
        calls++;
        return calls === 1 ? 0 : 0.99;
      });
    });

    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).click();
    flush();
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

    // First tick: index 0 -> m1, rand 0.99 -> m1 finishes. Afterwards every
    // tick is an ODDS_UPDATE (0.1) on the remaining live matches.
    let calls = 0;
    cy.window().then(win => {
      cy.stub(win.Math, 'random').callsFake(() => {
        calls++;
        if (calls === 1) return 0;
        if (calls === 2) return 0.99;
        return 0.1;
      });
    });

    // Selection on m1 (first card) and on the other displayed card.
    cy.get('[data-cy="match-card"]').first().find('[data-cy="odds-button"]').eq(0).click();
    flush();
    cy.get('[data-cy="match-card"]').eq(1).find('[data-cy="odds-button"]').eq(0).click();
    flush();
    cy.get('[data-cy="slip-count"]').should('have.text', '2');

    cy.tick(2500); // m1 finishes
    cy.get('[data-cy="slip-count"]').should('have.text', '1');
  });
});