import { Winner, VerificationStatus } from '../models/Winner';
import { User } from '../models/User';
import { getFileUrl } from '../utils/upload';
import { AppError } from '../middlewares/errorHandler';
import { emailService } from './emailService';

export const winnerService = {
  async getMyWinnings(userId: string) {
    return Winner.find({ userId })
      .sort({ createdAt: -1 })
      .populate('drawId', 'month drawNumbers prizePool')
      .populate('charityId', 'name logoUrl');
  },

  async uploadProof(winnerId: string, userId: string, file: Express.Multer.File) {
    const winner = await Winner.findById(winnerId);
    if (!winner) throw new AppError('Winner record not found', 404, 'WINNER_NOT_FOUND');
    if (winner.userId.toString() !== userId) {
      throw new AppError('You are not authorized to upload proof for this winner', 403, 'FORBIDDEN');
    }
    if (winner.verificationStatus === 'approved') {
      throw new AppError('This win has already been verified', 400, 'ALREADY_VERIFIED');
    }

    winner.proofImageUrl = getFileUrl(file.filename);
    winner.verificationStatus = 'pending';
    await winner.save();
    return winner;
  },

  async getAllWinners(filters: { status?: VerificationStatus; drawId?: string; page?: number; limit?: number }) {
    const { status, drawId, page = 1, limit = 20 } = filters;
    const query: Record<string, unknown> = {};
    if (status) query.verificationStatus = status;
    if (drawId) query.drawId = drawId;

    const skip = (page - 1) * limit;
    const [winners, total] = await Promise.all([
      Winner.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('drawId', 'month drawNumbers')
        .populate('charityId', 'name'),
      Winner.countDocuments(query),
    ]);

    return { winners, total, page, totalPages: Math.ceil(total / limit) };
  },

  async verifyWinner(winnerId: string, adminId: string, status: VerificationStatus, notes?: string) {
    const winner = await Winner.findById(winnerId);
    if (!winner) throw new AppError('Winner not found', 404, 'WINNER_NOT_FOUND');
    if (!winner.proofImageUrl) throw new AppError('No proof uploaded yet', 400, 'NO_PROOF');

    winner.verificationStatus = status;
    winner.adminNotes = notes || '';
    winner.verifiedAt = new Date();
    winner.verifiedBy = adminId as any;
    if (status === 'approved') winner.paymentStatus = 'processing';
    await winner.save();

    const user = await User.findById(winner.userId);
    if (user) {
      emailService.sendVerificationResult(user, winner, status).catch(console.error);
    }

    return winner;
  },
};
