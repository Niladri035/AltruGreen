import { Score } from '../models/Score';
import { AppError } from '../middlewares/errorHandler';

export const scoreService = {
  async getScores(userId: string) {
    const scoreDoc = await Score.findOne({ userId });
    if (!scoreDoc) return { scores: [], total: 0 };

    const sorted = [...scoreDoc.scores].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return { scores: sorted, total: sorted.length };
  },

  async addScore(userId: string, value: number) {
    if (value < 1 || value > 45) {
      throw new AppError('Score must be between 1 and 45 (Stableford range)', 400, 'INVALID_SCORE');
    }

    let scoreDoc = await Score.findOne({ userId });
    const newEntry = { value, submittedAt: new Date() };

    if (!scoreDoc) {
      scoreDoc = await Score.create({ userId, scores: [newEntry] });
    } else {
      // FIFO: add new score, remove oldest if exceeds 5
      scoreDoc.scores.push(newEntry);
      if (scoreDoc.scores.length > 5) {
        // Sort oldest first, remove first (oldest)
        scoreDoc.scores.sort(
          (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );
        scoreDoc.scores.shift();
      }
      await scoreDoc.save();
    }

    // Return sorted newest first
    const sorted = [...scoreDoc.scores].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return { scores: sorted, total: sorted.length, message: 'Score added successfully' };
  },

  async getUserScoreValues(userId: string): Promise<number[]> {
    const scoreDoc = await Score.findOne({ userId });
    if (!scoreDoc || scoreDoc.scores.length === 0) return [];
    return scoreDoc.scores.map((s) => s.value);
  },

  async getAllActiveScores(): Promise<Array<{ userId: string; scores: number[] }>> {
    const allScores = await Score.find({ 'scores.0': { $exists: true } });
    return allScores.map((doc) => ({
      userId: doc.userId.toString(),
      scores: doc.scores.map((s) => s.value),
    }));
  },
};
