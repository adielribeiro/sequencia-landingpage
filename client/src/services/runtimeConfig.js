// Configuração centralizada de URL do servidor (Socket.IO + endpoints HTTP)
// Em produção: setar VITE_SERVER_URL ou VITE_SOCKET_URL (ex: https://sequencia.onrender.com)
// Em dev local: normalmente http://localhost:4000

function normalizeBaseUrl(url) {
  if (!url) return url;
  return String(url).replace(/\/+$/, '');
}

export const SERVER_URL = normalizeBaseUrl(
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://sequencia.onrender.com')
);
