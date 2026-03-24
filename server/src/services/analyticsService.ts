import { User } from '../models/User';
import { Draw } from '../models/Draw';
import { Transaction } from '../models/Transaction';
import { Winner } from '../models/Winner';
import { Charity } from '../models/Charity';

export const analyticsService = {
  async getDashboardMetrics() {
    const [
      totalUsers,
      activeSubscribers,
      totalDraws,
      charitiesCount,
      donationResult,
      revenueResult,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ subscriptionStatus: { $in: ['active', 'trialing'] }, isActive: true }),
      Draw.countDocuments({ status: 'executed' }),
      Charity.countDocuments({ isActive: true }),
      Transaction.aggregate([
        { $match: { type: 'donation', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'subscription', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      totalUsers,
      activeSubscribers,
      totalDraws,
      charitiesCount,
      totalDonated: donationResult[0]?.total || 0,
      totalRevenue: revenueResult[0]?.total || 0,
      conversionRate: totalUsers > 0 ? Math.round((activeSubscribers / totalUsers) * 100) : 0,
    };
  },

  async getRevenueByMonth() {
    return Transaction.aggregate([
      { $match: { type: 'subscription', status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', revenue: 1, count: 1, _id: 0 } },
    ]);
  },

  async getCharityBreakdown() {
    return Transaction.aggregate([
      { $match: { type: 'donation', status: 'completed', charityId: { $ne: null } } },
      { $group: { _id: '$charityId', totalDonated: { $sum: '$amount' }, donations: { $sum: 1 } } },
      { $lookup: { from: 'charities', localField: '_id', foreignField: '_id', as: 'charity' } },
      { $unwind: '$charity' },
      { $project: { name: '$charity.name', logoUrl: '$charity.logoUrl', totalDonated: 1, donations: 1 } },
      { $sort: { totalDonated: -1 } },
    ]);
  },

  async getDrawParticipation() {
    return Draw.aggregate([
      { $match: { status: 'executed' } },
      {
        $project: {
          month: 1,
          totalEntries: 1,
          winnersCount: { $size: '$winnersSnapshot' },
          prizePool: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);
  },

  async getUserGrowth() {
    return User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', newUsers: 1, _id: 0 } },
    ]);
  },

  async getAdminUserList(page: number, limit: number, search?: string) {
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('charityId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  },
};
