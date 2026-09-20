/**
 * Safe API request utility for EMBERFALL.
 * Provides seamless fallbacks when running on static hosting like GitHub Pages
 * where Express backend routes are not available.
 */

export const isStaticDeployment = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.protocol === 'file:'
);

export async function safeApiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  if (isStaticDeployment) {
    throw new Error('Static hosting detected: Express API offline, using local game storage.');
  }

  const base = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : '';

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
  }

  return response;
}
