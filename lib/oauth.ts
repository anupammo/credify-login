// Lightweight OAuth (authorization-code) helpers for Google and Microsoft.
// On success the callback issues the same `credify_token` JWT cookie the rest
// of the app uses, so SSO logins share one session system with email/password.

export type OAuthProvider = 'google' | 'microsoft';

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export interface OAuthProfile {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  [key: string]: unknown;
}

export function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

// Build an absolute app URL from the public origin (NEXTAUTH_URL), NOT from the
// incoming request — behind Nginx, req.url resolves to localhost:3001 and would
// redirect users off-site. Use this for every server-side redirect.
export function appUrl(path: string): URL {
  return new URL(path, baseUrl());
}

export function redirectUri(provider: OAuthProvider): string {
  return `${baseUrl()}/api/auth/callback/${provider}`;
}

export function getProviderConfig(provider: string): ProviderConfig | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId,
      clientSecret,
      scope: 'openid email profile',
    };
  }
  if (provider === 'microsoft') {
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    const tenant = process.env.AZURE_AD_TENANT_ID || 'common';
    return {
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientId,
      clientSecret,
      scope: 'openid email profile',
    };
  }
  return null;
}

export function buildAuthUrl(provider: OAuthProvider, config: ProviderConfig, state: string): string {
  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri(provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  if (provider === 'google') url.searchParams.set('access_type', 'offline');
  return url.toString();
}

export async function exchangeCodeForTokens(provider: OAuthProvider, code: string): Promise<TokenResponse> {
  const config = getProviderConfig(provider);
  if (!config) throw new Error(`Provider not configured: ${provider}`);

  const resp = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(provider),
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token exchange failed (${resp.status}): ${await resp.text()}`);
  }
  return resp.json();
}

function decodeJwtClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split('.')[1];
  if (!payload) return {};
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(json);
}

export function profileFromTokens(tokens: TokenResponse): OAuthProfile {
  const claims = tokens.id_token ? decodeJwtClaims(tokens.id_token) : {};

  const email = (claims.email as string) || (claims.preferred_username as string) || null;
  let firstName: string | null = (claims.given_name as string) ?? null;
  let lastName: string | null = (claims.family_name as string) ?? null;

  if ((!firstName || !lastName) && typeof claims.name === 'string') {
    const parts = claims.name.trim().split(/\s+/);
    if (!firstName) firstName = parts[0] ?? null;
    if (!lastName) lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  }

  return {
    email: email ? email.toLowerCase().trim() : null,
    firstName,
    lastName,
    image: (claims.picture as string) ?? null,
  };
}
