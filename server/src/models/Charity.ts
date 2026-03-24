import mongoose, { Document, Schema } from 'mongoose';

export interface ICharity extends Document {
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  registrationNumber: string;
  isActive: boolean;
  totalDonated: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CharitySchema = new Schema<ICharity>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 1000 },
    logoUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    totalDonated: { type: Number, default: 0, min: 0 },
    memberCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

CharitySchema.index({ isActive: 1 });
CharitySchema.index({ totalDonated: -1 });

export const Charity = mongoose.model<ICharity>('Charity', CharitySchema);
