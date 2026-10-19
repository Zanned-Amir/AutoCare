/** `ng serve`: /api is forwarded to the backend by proxy.conf.mjs (API_PROXY_TARGET). */
export const environment = {
  production: false,
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
