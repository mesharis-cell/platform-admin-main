/**
 * Password Reset API Route
 *
 * Simple password reset implementation that sends email instructions
 * Note: For MVP, passwords must be reset by administrators
 */

import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json();

		if (!email) {
			return NextResponse.json({ error: 'Email is required' }, { status: 400 });
		}

		// Find user by email
		const users = await db.select().from(user).where(eq(user.email, email)).limit(1);

		if (users.length === 0) {
			// Return success even if user doesn't exist (security best practice)
			return NextResponse.json({
				success: true,
				message: 'If this email exists, reset instructions have been sent.'
			});
		}

		const foundUser = users[0];

		// Send instructions email
		if (process.env.NODE_ENV === 'development') {
			console.log('='.repeat(80));
			console.log('PASSWORD RESET EMAIL (Development Mode - Not Sent)');
			console.log('='.repeat(80));
			console.log('To:', email);
			console.log('User:', foundUser.name);
			console.log('Message: Contact your administrator to reset your password');
			console.log('='.repeat(80));
		} else {
			await resend.emails.send({
				from: process.env.RESEND_FROM_EMAIL || 'Asset Fulfillment <noreply@assetfulfillment.com>',
				to: email,
				subject: 'Password Reset Request - PMG Platform',
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Password Reset Request</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">You requested to reset your password for PMG Platform.</p>
							<div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
								<p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1e40af;">To reset your password:</p>
								<p style="margin: 0; font-size: 14px; color: #374151;">Please contact your system administrator or PMG support. For security reasons, password resets must be handled by administrators.</p>
							</div>
							<p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
							<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
								<p style="margin: 0; font-size: 12px; color: #9ca3af;">PMG Asset Fulfillment Platform • Secure System</p>
							</div>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			});
		}

		return NextResponse.json({
			success: true,
			message: 'If this email exists, reset instructions have been sent.'
		});
	} catch (error) {
		console.error('Forgot password error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
