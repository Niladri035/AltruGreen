import { scoreService } from '../services/scoreService';
import { Score } from '../models/Score';

// Mock Mongoose Score model
jest.mock('../models/Score');

const mockUserId = 'user123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scoreService', () => {
  describe('addScore', () => {
    it('should reject scores below 1', async () => {
      await expect(scoreService.addScore(mockUserId, 0)).rejects.toMatchObject({
        message: expect.stringContaining('between 1 and 45'),
      });
    });

    it('should reject scores above 45', async () => {
      await expect(scoreService.addScore(mockUserId, 46)).rejects.toMatchObject({
        message: expect.stringContaining('between 1 and 45'),
      });
    });

    it('should create a new score document when none exists', async () => {
      (Score.findOne as jest.Mock).mockResolvedValue(null);
      (Score.create as jest.Mock).mockResolvedValue({
        scores: [{ value: 30, submittedAt: new Date() }],
        save: jest.fn(),
      });
      const result = await scoreService.addScore(mockUserId, 30);
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].value).toBe(30);
    });

    it('should enforce FIFO when adding a 6th score', async () => {
      const now = Date.now();
      const existingScores = [
        { value: 10, submittedAt: new Date(now - 5000) }, // oldest
        { value: 20, submittedAt: new Date(now - 4000) },
        { value: 30, submittedAt: new Date(now - 3000) },
        { value: 40, submittedAt: new Date(now - 2000) },
        { value: 35, submittedAt: new Date(now - 1000) },
      ];

      const mockDoc = {
        scores: [...existingScores],
        save: jest.fn().mockResolvedValue(true),
      };

      (Score.findOne as jest.Mock).mockResolvedValue(mockDoc);

      const result = await scoreService.addScore(mockUserId, 25);
      expect(result.scores).toHaveLength(5);
      // Oldest (value: 10) should be removed
      const values = result.scores.map((s) => s.value);
      expect(values).not.toContain(10);
      expect(values).toContain(25);
    });

    it('should return scores sorted newest first', async () => {
      const now = Date.now();
      const mockDoc = {
        scores: [
          { value: 10, submittedAt: new Date(now - 3000) },
          { value: 20, submittedAt: new Date(now - 1000) },
          { value: 15, submittedAt: new Date(now - 2000) },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      (Score.findOne as jest.Mock).mockResolvedValue(mockDoc);

      const result = await scoreService.addScore(mockUserId, 30);
      const timestamps = result.scores.map((s) => new Date(s.submittedAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });
});
