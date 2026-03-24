import { Charity } from '../models/Charity';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { AppError } from '../middlewares/errorHandler';

export interface CreateCharityDto {
  name: string;
  description: string;
  logoUrl?: string;
  websiteUrl?: string;
  registrationNumber?: string;
}

export const charityService = {
  async listCharities() {
    return Charity.find({ isActive: true }).sort({ totalDonated: -1 });
  },

  async getCharity(id: string) {
    const charity = await Charity.findById(id);
    if (!charity) throw new AppError('Charity not found', 404, 'CHARITY_NOT_FOUND');
    return charity;
  },

  async createCharity(dto: CreateCharityDto) {
    const existing = await Charity.findOne({ name: dto.name });
    if (existing) throw new AppError('A charity with this name already exists', 409, 'DUPLICATE_CHARITY');
    return Charity.create(dto);
  },

  async updateCharity(id: string, updates: Partial<CreateCharityDto> & { isActive?: boolean }) {
    const charity = await Charity.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!charity) throw new AppError('Charity not found', 404, 'CHARITY_NOT_FOUND');
    return charity;
  },

  async deleteCharity(id: string) {
    const charity = await Charity.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!charity) throw new AppError('Charity not found', 404, 'CHARITY_NOT_FOUND');
    return { message: 'Charity deactivated successfully' };
  },

  async getCharityStats() {
    const stats = await Transaction.aggregate([
      { $match: { type: 'donation', status: 'completed', charityId: { $ne: null } } },
      {
        $group: {
          _id: '$charityId',
          totalDonated: { $sum: '$amount' },
          donationCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'charities',
          localField: '_id',
          foreignField: '_id',
          as: 'charity',
        },
      },
      { $unwind: '$charity' },
      {
        $project: {
          charityId: '$_id',
          name: '$charity.name',
          logoUrl: '$charity.logoUrl',
          totalDonated: 1,
          donationCount: 1,
        },
      },
      { $sort: { totalDonated: -1 } },
    ]);
    return stats;
  },

  async getUserCountPerCharity() {
    return User.aggregate([
      { $match: { charityId: { $ne: null }, isActive: true } },
      { $group: { _id: '$charityId', count: { $sum: 1 } } },
    ]);
  },
};
