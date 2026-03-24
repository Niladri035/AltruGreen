import mongoose, { Document, Schema } from 'mongoose';

export interface IScoreEntry {
  value: number;
  submittedAt: Date;
}

export interface IScore extends Document {
  userId: mongoose.Types.ObjectId;
  scores: IScoreEntry[];
  updatedAt: Date;
}

const ScoreEntrySchema = new Schema<IScoreEntry>(
  {
    value: { type: Number, required: true, min: 1, max: 45 },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ScoreSchema = new Schema<IScore>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    scores: {
      type: [ScoreEntrySchema],
      default: [],
      validate: {
        validator: (arr: IScoreEntry[]) => arr.length <= 5,
        message: 'Maximum 5 scores allowed',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

ScoreSchema.index({ userId: 1 });

// Virtual: scores sorted newest first
ScoreSchema.virtual('sortedScores').get(function () {
  return [...this.scores].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
});

export const Score = mongoose.model<IScore>('Score', ScoreSchema);
