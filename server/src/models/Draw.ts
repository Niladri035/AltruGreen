import mongoose, { Document, Schema } from 'mongoose';

export type DrawStatus = 'pending' | 'simulated' | 'executed' | 'cancelled';
export type DrawType = 'random' | 'algorithm';

export interface IDrawWinnerSnapshot {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  matchCount: number;
  userScores: number[];
  prizeAmount: number;
  charityDonation: number;
}

export interface IDraw extends Document {
  month: string; // YYYY-MM
  status: DrawStatus;
  drawNumbers: number[];
  executionType: DrawType;
  prizePool: number;
  rolloverAmount: number;
  totalEntries: number;
  winnersSnapshot: IDrawWinnerSnapshot[];
  executedAt: Date | null;
  adminId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const DrawWinnerSnapshotSchema = new Schema<IDrawWinnerSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    matchCount: { type: Number, required: true, min: 3, max: 5 },
    userScores: [{ type: Number }],
    prizeAmount: { type: Number, required: true },
    charityDonation: { type: Number, default: 0 },
  },
  { _id: false }
);

const DrawSchema = new Schema<IDraw>(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
    status: {
      type: String,
      enum: ['pending', 'simulated', 'executed', 'cancelled'],
      default: 'pending',
    },
    drawNumbers: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.length === 0 || arr.length === 5,
        message: 'Draw must have exactly 5 numbers',
      },
    },
    executionType: { type: String, enum: ['random', 'algorithm'], default: 'random' },
    prizePool: { type: Number, default: 0, min: 0 },
    rolloverAmount: { type: Number, default: 0, min: 0 },
    totalEntries: { type: Number, default: 0 },
    winnersSnapshot: { type: [DrawWinnerSnapshotSchema], default: [] },
    executedAt: { type: Date, default: null },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

DrawSchema.index({ month: 1, status: 1 });

export const Draw = mongoose.model<IDraw>('Draw', DrawSchema);
