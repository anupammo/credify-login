import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, normalizePhone, validatePassword, isValidEmail, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, company, phone, source, sourceLabel } = body;

    // Validations
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 });
    }
    if (!email?.trim() || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: 'Password requirements not met' }, { status: 400 });
    }
    if (!company?.trim()) {
      return NextResponse.json({ error: 'Company name required' }, { status: 400 });
    }
    const phoneDigits = normalizePhone(phone);
    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }
    if (!source) {
      return NextResponse.json({ error: 'Source required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const existingEmail = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phoneDigits } });
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already linked to an account' }, { status: 409 });
    }

    const finalSourceLabel = source === 'other' && sourceLabel ? sourceLabel : getSourceLabel(source);
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: emailLower,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        phoneRaw: phone.trim(),
        phoneDigits,
        source,
        sourceLabel: finalSourceLabel,
        passwordHash,
      },
    });

    // Log the new user in immediately by issuing the same session cookie as login.
    const token = generateToken(user.id, user.email);
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
    response.cookies.set('credify_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    search: 'Google or web search',
    referral: 'Referral from a colleague',
    social: 'Social media (LinkedIn, etc.)',
    conference: 'Conference or event',
    webinar: 'Webinar or podcast',
    customer: 'Existing Credify customer',
    reseller: 'Partner or reseller',
    other: 'Other',
  };
  return labels[source] || source;
}