import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProviderConfig, buildAuthUrl, type OAuthProvider } from '@/lib/oauth';

// GET /api/auth/oauth/google | /api/auth/oauth/microsoft
// Kicks off the OAuth flow: stores an anti-CSRF state cookie and redirects
// the user to the provider's consent screen.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = getProviderConfig(provider);

  if (!config) {
    return NextResponse.redirect(new URL('/login?error=oauth_unavailable', req.url));
  }

  const state = randomUUID();
  const response = NextResponse.redirect(buildAuthUrl(provider as OAuthProvider, config, state));
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
