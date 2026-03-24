import mongoose, { Document, Schema } from 'mongoose';

export type WinnerTier = '3-match' | '4-match' | '5-match';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface IWinner extends Document {
  drawId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tier: WinnerTier;
  matchCount: number;
  prizeAmount: number;
  charityDonationAmount: number;
  charityId: mongoose.Types.ObjectId | null;
  proofImageUrl: string | null;
  verificationStatus: VerificationStatus;
  adminNotes: string;
  verifiedAt: Date | null;
  verifiedBy: mongoose.Types.ObjectId | null;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const WinnerSchema = new Schema<IWinner>(
  {
    drawId: { type: Schema.Types.ObjectId, ref: 'Draw', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tier: { type: String, enum: ['3-match', '4-match', '5-match'], required: true },
    matchCount: { type: Number, required: true, min: 3, max: 5 },
    prizeAmount: { type: Number, required: true, min: 0 },
    charityDonationAmount: { type: Number, default: 0, min: 0 },
    charityId: { type: Schema.Types.ObjectId, ref: 'Charity', default: null },
    proofImageUrl: { type: String, default: null },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

WinnerSchema.index({ drawId: 1, userId: 1 });
WinnerSchema.index({ verificationStatus: 1 });
WinnerSchema.index({ userId: 1, createdAt: -1 });

export const Winner = mongoose.model<IWinner>('Winner', WinnerSchema);
