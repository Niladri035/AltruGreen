import { getStripe } from '../config/stripe';
import { env } from '../config/env';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { Transaction } from '../models/Transaction';
import { AppError } from '../middlewares/errorHandler';
import { emailService } from './emailService';
import Stripe from 'stripe';

export type PlanType = 'monthly' | 'yearly';

export const subscriptionService = {
  async createCheckoutSession(userId: string, plan: PlanType): Promise<{ url: string }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    if (!user.stripeCustomerId) {
      throw new AppError('Stripe customer not found. Please contact support.', 400, 'NO_STRIPE_CUSTOMER');
    }

    const priceId = plan === 'monthly' ? env.STRIPE_PRICE_ID_MONTHLY : env.STRIPE_PRICE_ID_YEARLY;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.CLIENT_URL}/dashboard?subscription=success`,
      cancel_url: `${env.CLIENT_URL}/pricing?subscription=cancelled`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) throw new AppError('Failed to create checkout session', 500);
    return { url: session.url };
  },

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const user = await User.findById(userId);
    if (!user?.stripeCustomerId) throw new AppError('Stripe customer not found', 400);

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.CLIENT_URL}/dashboard/subscription`,
    });

    return { url: session.url };
  },

  async getSubscriptionStatus(userId: string) {
    const sub = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
    const user = await User.findById(userId).select('subscriptionStatus');
    return { subscription: sub, status: user?.subscriptionStatus || 'inactive' };
  },

  // ─── Stripe Webhook Handler ───────────────────────────────────────────────
  async handleWebhook(payload: Buffer, sig: string): Promise<void> {
    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new AppError(`Webhook signature verification failed: ${(err as Error).message}`, 400, 'WEBHOOK_ERROR');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this._handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this._handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this._handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this._handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this._handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  },

  async _handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (!session.subscription || !session.customer) return;
    const userId = session.metadata?.userId;
    if (!userId) return;

    const stripe = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
    const plan = (session.metadata?.plan as PlanType) || 'monthly';

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSub.id },
      {
        userId,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: stripeSub.items.data[0].price.id,
        stripeCustomerId: session.customer as string,
        plan,
        status: stripeSub.status as any,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(userId, { subscriptionStatus: 'active' });

    const user = await User.findById(userId);
    if (user) emailService.sendSubscriptionConfirmation(user, plan).catch(console.error);
  },

  async _handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription as string });
    if (!sub) return;

    await User.findByIdAndUpdate(sub.userId, { subscriptionStatus: 'active' });

    const amountPaid = invoice.amount_paid;
    await Transaction.create({
      userId: sub.userId,
      type: 'subscription',
      amount: amountPaid,
      currency: invoice.currency,
      stripePaymentIntentId: invoice.payment_intent as string,
      status: 'completed',
      description: `Subscription payment - ${sub.plan}`,
    });
  },

  async _handlePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription as string });
    if (!sub) return;

    await User.findByIdAndUpdate(sub.userId, { subscriptionStatus: 'past_due' });
    await Subscription.findByIdAndUpdate(sub._id, { status: 'past_due' });

    const user = await User.findById(sub.userId);
    if (user) emailService.sendPaymentFailedEmail(user).catch(console.error);
  },

  async _handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const sub = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSub.id },
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    );
    if (!sub) return;

    await User.findByIdAndUpdate(sub.userId, { subscriptionStatus: 'cancelled' });

    const user = await User.findById(sub.userId);
    if (user) emailService.sendCancellationEmail(user).catch(console.error);
  },

  async _handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSub.id },
      {
        status: stripeSub.status as any,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      }
    );

    const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
    if (sub) {
      const userStatus =
        stripeSub.status === 'active'
          ? 'active'
          : stripeSub.status === 'past_due'
          ? 'past_due'
          : 'cancelled';
      await User.findByIdAndUpdate(sub.userId, { subscriptionStatus: userStatus });
    }
  },
};
