import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import {
  getProviderConfig,
  exchangeCodeForTokens,
  profileFromTokens,
  appUrl,
  type OAuthProvider,
} from '@/lib/oauth';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  'azure-ad': 'Microsoft',
};

// GET /api/auth/callback/google | /api/auth/callback/microsoft
// Handles the redirect back from the provider: verifies state, exchanges the
// code for tokens, upserts the user, and issues the credify_token session.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const loginUrl = appUrl('/login');

  const config = getProviderConfig(provider);
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const stateCookie = req.cookies.get('oauth_state')?.value;

  // Validate provider, the authorization code, and the anti-CSRF state.
  if (!config || !code || !state || !stateCookie || state !== stateCookie) {
    loginUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(provider as OAuthProvider, code);
    const profile = profileFromTokens(tokens);

    if (!profile.email) {
      loginUrl.searchParams.set('error', 'oauth_no_email');
      return NextResponse.redirect(loginUrl);
    }

    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        image: profile.image ?? undefined,
        emailVerified: new Date(),
      },
      create: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        image: profile.image,
        source: provider,
        sourceLabel: PROVIDER_LABELS[provider] ?? provider,
        emailVerified: new Date(),
      },
    });

    const token = generateToken(user.id, user.email);
    const response = NextResponse.redirect(appUrl('/dashboard'));
    response.cookies.set('credify_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });
    response.cookies.delete('oauth_state');
    return response;
  } catch (error) {
    console.error(`OAuth callback error (${provider}):`, error);
    loginUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(loginUrl);
  }
}
