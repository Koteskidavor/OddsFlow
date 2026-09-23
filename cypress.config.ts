import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'e2e/**/*.cy.ts',
    supportFile: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000
  }
});