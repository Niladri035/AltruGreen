import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatusDB = 'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing' | 'unpaid';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeCustomerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatusDB;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stripeSubscriptionId: { type: String, required: true, unique: true },
    stripePriceId: { type: String, required: true },
    stripeCustomerId: { type: String, required: true },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'incomplete', 'trialing', 'unpaid'],
      required: true,
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
