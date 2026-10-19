/**
 * Production build. The API is served on the same origin under /api (nginx in front),
 * so the refresh cookie stays first-party. Only public values belong here: this file
 * ends up in the browser bundle.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  /**
   * Map tiles. OpenStreetMap's own servers need no key but are for light use only; in production
   * set a provider you have an account with (MapTiler, Stadia, Esri) and its attribution.
   */
  mapTiles: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};
