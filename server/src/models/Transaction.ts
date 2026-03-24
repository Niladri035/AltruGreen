import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'subscription' | 'donation' | 'prize_payout' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  charityId: mongoose.Types.ObjectId | null;
  drawId: mongoose.Types.ObjectId | null;
  winnerId: mongoose.Types.ObjectId | null;
  status: TransactionStatus;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['subscription', 'donation', 'prize_payout', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'gbp' },
    stripePaymentIntentId: { type: String, default: null },
    charityId: { type: Schema.Types.ObjectId, ref: 'Charity', default: null },
    drawId: { type: Schema.Types.ObjectId, ref: 'Draw', default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: 'Winner', default: null },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    description: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ charityId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
