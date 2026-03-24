import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { IUser } from '../models/User';
import { IWinner } from '../models/Winner';
import { IDraw } from '../models/Draw';

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: env.EMAIL_SERVICE_API_KEY || 'no-key',
  },
});

const baseTemplate = (content: string, title: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Inter', Arial, sans-serif; background:#0a2416; color:#f0f0f0; margin:0; padding:0;">
  <div style="max-width:600px; margin:40px auto; background:rgba(255,255,255,0.05); border-radius:16px; overflow:hidden; border:1px solid rgba(201,168,76,0.2);">
    <div style="background:linear-gradient(135deg,#0a2416,#1a4d2e); padding:32px; text-align:center;">
      <h1 style="color:#c9a84c; margin:0; font-size:28px; letter-spacing:-0.5px;">🌿 AltruGreen</h1>
      <p style="color:rgba(255,255,255,0.6); margin:8px 0 0; font-size:14px;">Play Golf. Win Big. Change Lives.</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:24px 32px; border-top:1px solid rgba(255,255,255,0.1); text-align:center;">
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">
        AltruGreen Golf Charity Platform &bull; <a href="${env.CLIENT_URL}" style="color:#c9a84c;">Visit Website</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  if (env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"AltruGreen" <${env.ADMIN_EMAIL}>`,
    to,
    subject,
    html,
  });
};

export const emailService = {
  async sendWelcomeEmail(user: IUser): Promise<void> {
    const html = baseTemplate(
      `<h2 style="color:#c9a84c; margin-top:0;">Welcome to AltruGreen, ${user.name}! 🎉</h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         You've joined a community of golfers making a real difference. Each month you'll have the chance to win prizes while your selected charity receives donations.
       </p>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         <strong style="color:#c9a84c;">Next steps:</strong><br>
         1. Subscribe to a plan<br>
         2. Enter your last 5 Stableford scores<br>
         3. Wait for the monthly draw!
       </p>
       <a href="${env.CLIENT_URL}/dashboard" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Go to Dashboard →</a>`,
      'Welcome to AltruGreen'
    );
    await sendMail(user.email, 'Welcome to AltruGreen! 🌿', html);
  },

  async sendSubscriptionConfirmation(user: IUser, plan: string): Promise<void> {
    const html = baseTemplate(
      `<h2 style="color:#c9a84c; margin-top:0;">Subscription Confirmed! ✅</h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         Your <strong style="color:#c9a84c;">${plan}</strong> subscription is now active. You're all set to participate in monthly draws!
       </p>
       <a href="${env.CLIENT_URL}/dashboard/scores" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Enter Your Scores →</a>`,
      'Subscription Confirmed'
    );
    await sendMail(user.email, '✅ Your AltruGreen subscription is active', html);
  },

  async sendPaymentFailedEmail(user: IUser): Promise<void> {
    const html = baseTemplate(
      `<h2 style="color:#e74c3c; margin-top:0;">Payment Issue ⚠️</h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         We were unable to process your subscription payment. Please update your payment method to continue participating in draws.
       </p>
       <a href="${env.CLIENT_URL}/dashboard/subscription" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Update Payment Method →</a>`,
      'Payment Failed'
    );
    await sendMail(user.email, '⚠️ Payment issue with your AltruGreen subscription', html);
  },

  async sendCancellationEmail(user: IUser): Promise<void> {
    const html = baseTemplate(
      `<h2 style="color:#c9a84c; margin-top:0;">Subscription Cancelled</h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         Your AltruGreen subscription has been cancelled. We're sorry to see you go!
         You can resubscribe at any time to rejoin the community.
       </p>
       <a href="${env.CLIENT_URL}/pricing" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Resubscribe →</a>`,
      'Subscription Cancelled'
    );
    await sendMail(user.email, 'Your AltruGreen subscription has been cancelled', html);
  },

  async sendWinnerNotification(user: IUser, winner: IWinner, draw: IDraw): Promise<void> {
    const tierLabel = winner.tier === '5-match' ? '🏆 Jackpot' : winner.tier === '4-match' ? '🥈 4-Match' : '🥉 3-Match';
    const prizeGBP = (winner.prizeAmount / 100).toFixed(2);
    const html = baseTemplate(
      `<h2 style="color:#c9a84c; margin-top:0;">You're a Winner! ${tierLabel}</h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         Congratulations ${user.name}! You matched ${winner.matchCount} numbers in the ${draw.month} draw.
       </p>
       <div style="background:rgba(201,168,76,0.1); border:1px solid rgba(201,168,76,0.3); border-radius:12px; padding:20px; margin:20px 0;">
         <p style="color:#c9a84c; margin:0 0 8px; font-size:14px;">Prize Amount</p>
         <p style="color:#fff; margin:0; font-size:32px; font-weight:700;">£${prizeGBP}</p>
       </div>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         Please upload proof of your score card to claim your prize.
       </p>
       <a href="${env.CLIENT_URL}/dashboard/winnings" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">Upload Proof & Claim →</a>`,
      'You Won!'
    );
    await sendMail(user.email, `🏆 You won £${prizeGBP} in the AltruGreen ${draw.month} draw!`, html);
  },

  async sendVerificationResult(user: IUser, winner: IWinner, status: string): Promise<void> {
    const approved = status === 'approved';
    const html = baseTemplate(
      `<h2 style="color:${approved ? '#c9a84c' : '#e74c3c'}; margin-top:0;">
        ${approved ? '✅ Prize Claim Approved!' : '❌ Proof Rejected'}
       </h2>
       <p style="color:rgba(255,255,255,0.8); line-height:1.6;">
         ${approved
           ? `Your proof of score has been approved. Your prize of £${(winner.prizeAmount / 100).toFixed(2)} will be processed shortly.`
           : `Unfortunately your proof submission was rejected. ${winner.adminNotes ? `Reason: ${winner.adminNotes}` : 'Please resubmit with a clearer image.'}`
         }
       </p>
       <a href="${env.CLIENT_URL}/dashboard/winnings" style="display:inline-block; background:#c9a84c; color:#0a2416; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px;">View My Winnings →</a>`,
      approved ? 'Prize Approved' : 'Proof Rejected'
    );
    await sendMail(user.email, approved ? '✅ Your prize claim has been approved' : '❌ Proof submission rejected', html);
  },
};
