import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) return NextResponse.json({ success: true });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email.toLowerCase().trim(), resetLink);
    } catch (mailError) {
      // Don't leak SMTP/account state to the client; log for the operator.
      console.error('Failed to send password reset email:', mailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}