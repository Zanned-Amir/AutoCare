// Dev server proxy: the browser only talks to :4200, so cookies and CORS behave like production.
// Point it elsewhere with API_PROXY_TARGET=http://192.168.1.10:8080 npm start
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
