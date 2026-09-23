import { visitApp } from './helpers';

const SPORT_TABS = [
  {
    tab: 'Soccer',
    teams: ['Real Madrid', 'Barcelona', 'Manchester City', 'Arsenal'],
    others: ['LA Lakers', 'Iga Swiatek', 'FaZe Clan']
  },
  {
    tab: 'Basketball',
    teams: ['LA Lakers', 'GS Warriors', 'Milwaukee Bucks', 'Boston Celtics'],
    others: ['Real Madrid', 'Iga Swiatek', 'T1']
  },
  {
    tab: 'Tennis',
    teams: ['Novak Djokovic', 'Carlos Alcaraz', 'Iga Swiatek', 'Aryna Sabalenka'],
    others: ['Real Madrid', 'LA Lakers', 'Gen.G']
  },
  {
    tab: 'Esports',
    teams: ['T1', 'Gen.G', 'Natus Vincere', 'FaZe Clan'],
    others: ['Barcelona', 'Milwaukee Bucks', 'Novak Djokovic']
  }
] as const;

describe('Dashboard navigation', () => {
  beforeEach(() => {
    visitApp();
    cy.get('[data-cy="match-card"]').should('have.length', 2);
  });

  it('shows only the matches of the selected sport for every tab', () => {
    for (const { tab, teams, others } of SPORT_TABS) {
      const tabSelector = `[data-cy="sport-tab-${tab.toLowerCase()}"]`;

      cy.get(tabSelector).click();
      cy.get(tabSelector).should('have.class', 'active');

      cy.get('[data-cy="match-card"]').should('have.length', 2);
      cy.get('[data-cy="match-card"]').each($card => {
        cy.wrap($card).should('contain.text', tab.toLowerCase());
      });

      teams.forEach(team => {
        cy.contains(team).should('be.visible');
      });
      others.forEach(team => {
        cy.contains(team).should('not.exist');
      });
    }
  });
});