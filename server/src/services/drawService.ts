import crypto from 'crypto';
import { Draw, IDraw, DrawType } from '../models/Draw';
import { Winner } from '../models/Winner';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { scoreService } from './scoreService';
import { emailService } from './emailService';
import { AppError } from '../middlewares/errorHandler';

const PRIZE_POOL_MONTHLY = 50000; // pence = £500

// ─── Random Draw (cryptographically secure) ───────────────────────────────────
function generateRandomNumbers(): number[] {
  const numbers = new Set<number>();
  while (numbers.size < 5) {
    numbers.add(crypto.randomInt(1, 46)); // 1-45 inclusive
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

// ─── Algorithm-based Draw (weighted by score frequency) ───────────────────────
function generateAlgorithmNumbers(allEntries: Array<{ userId: string; scores: number[] }>): number[] {
  // Build frequency map of all scores across all active users
  const freq: number[] = new Array(46).fill(0); // index 0 unused
  for (const entry of allEntries) {
    for (const score of entry.scores) {
      if (score >= 1 && score <= 45) freq[score]++;
    }
  }

  const total = freq.reduce((sum, v) => sum + v, 0);
  if (total === 0) return generateRandomNumbers(); // fallback

  // Weighted random sampling without replacement
  const selected = new Set<number>();
  let attempts = 0;
  while (selected.size < 5 && attempts < 1000) {
    attempts++;
    let rand = Math.random() * total;
    for (let n = 1; n <= 45; n++) {
      rand -= freq[n];
      if (rand <= 0 && !selected.has(n)) {
        selected.add(n);
        break;
      }
    }
  }

  // Fill remaining randomly if needed
  while (selected.size < 5) {
    selected.add(crypto.randomInt(1, 46));
  }

  return Array.from(selected).sort((a, b) => a - b);
}

// ─── Match counter ─────────────────────────────────────────────────────────────
function countMatches(userScores: number[], drawNumbers: number[]): number {
  const drawSet = new Set(drawNumbers);
  return userScores.filter((s) => drawSet.has(s)).length;
}

// ─── Prize distribution ────────────────────────────────────────────────────────
function distributePrizes(
  entries: Array<{ userId: string; scores: number[]; name: string; email: string; charityId: string | null; donationPct: number }>,
  drawNumbers: number[],
  prizePool: number
) {
  const fiveMatch: typeof entries = [];
  const fourMatch: typeof entries = [];
  const threeMatch: typeof entries = [];

  for (const entry of entries) {
    const matches = countMatches(entry.scores, drawNumbers);
    if (matches === 5) fiveMatch.push(entry);
    else if (matches === 4) fourMatch.push(entry);
    else if (matches === 3) threeMatch.push(entry);
  }

  const results: Array<{
    userId: string; name: string; email: string; matchCount: number;
    userScores: number[]; prizeAmount: number; charityDonation: number; charityId: string | null;
  }> = [];

  const distribute = (group: typeof entries, sharePct: number, matchCount: number) => {
    if (group.length === 0) return;
    const totalForTier = Math.floor(prizePool * sharePct);
    const perWinner = Math.floor(totalForTier / group.length);
    for (const e of group) {
      const donationAmt = Math.floor(perWinner * (e.donationPct / 100));
      results.push({
        userId: e.userId,
        name: e.name,
        email: e.email,
        matchCount,
        userScores: e.scores,
        prizeAmount: perWinner,
        charityDonation: donationAmt,
        charityId: e.charityId,
      });
    }
  };

  distribute(fiveMatch, 0.4, 5);
  distribute(fourMatch, 0.35, 4);
  distribute(threeMatch, 0.25, 3);

  const hasJackpotWinner = fiveMatch.length > 0;
  return { results, hasJackpotWinner, tierCounts: { five: fiveMatch.length, four: fourMatch.length, three: threeMatch.length } };
}

// ─── Draw Service ──────────────────────────────────────────────────────────────
export const drawService = {
  getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  async getRolloverAmount(): Promise<number> {
    const prevDraws = await Draw.find({ status: 'executed' }).sort({ month: -1 }).limit(12);
    let rollover = 0;
    for (const draw of prevDraws) {
      if (draw.winnersSnapshot.filter((w) => w.matchCount === 5).length === 0) {
        rollover += Math.floor((draw.prizePool + draw.rolloverAmount) * 0.4);
      }
    }
    return rollover;
  },

  async getActiveEntries() {
    const activeUsers = await User.find({ subscriptionStatus: { $in: ['active', 'trialing'] }, isActive: true })
      .select('_id name email charityId donationPercentage')
      .populate('charityId', '_id');

    const allScores = await scoreService.getAllActiveScores();
    const scoreMap = new Map(allScores.map((s) => [s.userId, s.scores]));

    return activeUsers
      .map((u) => ({
        userId: u._id.toString(),
        name: u.name,
        email: u.email,
        charityId: u.charityId ? u.charityId.toString() : null,
        donationPct: u.donationPercentage,
        scores: scoreMap.get(u._id.toString()) || [],
      }))
      .filter((e) => e.scores.length > 0);
  },

  async simulateDraw(type: DrawType, month?: string) {
    const targetMonth = month || this.getCurrentMonth();
    const rolloverAmt = await this.getRolloverAmount();
    const prizePool = PRIZE_POOL_MONTHLY + rolloverAmt;
    const entries = await this.getActiveEntries();

    const drawNumbers =
      type === 'algorithm' ? generateAlgorithmNumbers(entries) : generateRandomNumbers();

    const { results, hasJackpotWinner, tierCounts } = distributePrizes(entries, drawNumbers, prizePool);

    return {
      month: targetMonth,
      type,
      drawNumbers,
      prizePool,
      rolloverAmount: rolloverAmt,
      totalEntries: entries.length,
      hasJackpotWinner,
      tierCounts,
      winners: results,
      isSimulation: true,
    };
  },

  async executeDraw(type: DrawType, adminId: string) {
    const month = this.getCurrentMonth();

    const existingDraw = await Draw.findOne({ month, status: 'executed' });
    if (existingDraw) {
      throw new AppError(`Draw for ${month} has already been executed`, 409, 'DRAW_ALREADY_EXECUTED');
    }

    const rolloverAmt = await this.getRolloverAmount();
    const prizePool = PRIZE_POOL_MONTHLY + rolloverAmt;
    const entries = await this.getActiveEntries();

    if (entries.length === 0) {
      throw new AppError('No eligible entries for this draw', 400, 'NO_ENTRIES');
    }

    const drawNumbers =
      type === 'algorithm' ? generateAlgorithmNumbers(entries) : generateRandomNumbers();

    const { results, hasJackpotWinner } = distributePrizes(entries, drawNumbers, prizePool);

    // Persist draw
    const draw = await Draw.findOneAndUpdate(
      { month },
      {
        month,
        status: 'executed',
        drawNumbers,
        executionType: type,
        prizePool,
        rolloverAmount: rolloverAmt,
        totalEntries: entries.length,
        winnersSnapshot: results,
        executedAt: new Date(),
        adminId,
      },
      { upsert: true, new: true }
    );

    // Persist winners + transactions
    for (const w of results) {
      const winner = await Winner.create({
        drawId: draw._id,
        userId: w.userId,
        tier: `${w.matchCount}-match` as '3-match' | '4-match' | '5-match',
        matchCount: w.matchCount,
        prizeAmount: w.prizeAmount,
        charityDonationAmount: w.charityDonation,
        charityId: w.charityId,
        verificationStatus: 'pending',
      });

      await Transaction.create({
        userId: w.userId,
        type: 'prize_payout',
        amount: w.prizeAmount,
        drawId: draw._id,
        winnerId: winner._id,
        status: 'pending',
        description: `Prize payout - ${w.matchCount}-match - ${month}`,
      });

      if (w.charityDonation > 0 && w.charityId) {
        await Transaction.create({
          userId: w.userId,
          type: 'donation',
          amount: w.charityDonation,
          charityId: w.charityId,
          drawId: draw._id,
          status: 'completed',
          description: `Charity donation from winnings - ${month}`,
        });
        const { Charity } = await import('../models/Charity');
        await Charity.findByIdAndUpdate(w.charityId, { $inc: { totalDonated: w.charityDonation } });
      }

      // Send winner email (non-blocking)
      const user = await User.findById(w.userId);
      if (user) {
        emailService.sendWinnerNotification(user, winner, draw).catch(console.error);
      }
    }

    return {
      draw,
      winners: results,
      hasJackpotWinner,
      totalWinners: results.length,
    };
  },

  async getDraws(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [draws, total] = await Promise.all([
      Draw.find().sort({ month: -1 }).skip(skip).limit(limit),
      Draw.countDocuments(),
    ]);
    return { draws, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getDrawById(id: string) {
    const draw = await Draw.findById(id);
    if (!draw) throw new AppError('Draw not found', 404, 'DRAW_NOT_FOUND');
    return draw;
  },

  async getCurrentDraw() {
    const month = this.getCurrentMonth();
    let draw = await Draw.findOne({ month });
    if (!draw) {
      const rolloverAmt = await this.getRolloverAmount();
      const prizePool = PRIZE_POOL_MONTHLY + rolloverAmt;
      draw = await Draw.create({ month, prizePool, rolloverAmount: rolloverAmt });
    }
    return draw;
  },
};
