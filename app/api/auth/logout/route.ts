import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Must match the attributes the cookie was set with (secure + sameSite),
  // or browsers won't reliably delete it and the proxy keeps seeing a session.
  response.cookies.set('credify_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}