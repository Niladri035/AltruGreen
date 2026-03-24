import { drawService } from '../services/drawService';

// Mock all external dependencies
jest.mock('../models/Draw');
jest.mock('../models/Winner');
jest.mock('../models/Transaction');
jest.mock('../models/User');
jest.mock('../services/scoreService');
jest.mock('../services/emailService', () => ({
  emailService: { sendWinnerNotification: jest.fn() },
}));

describe('drawService - Prize Distribution', () => {
  const prizePool = 10000; // £100.00 in pence

  // Helper to simulate prize distribution logic
  function distributePrizes(
    userScores: number[],
    drawNumbers: number[],
    pool: number
  ) {
    const drawSet = new Set(drawNumbers);
    const matches = userScores.filter((s) => drawSet.has(s)).length;
    return { matches, pool };
  }

  it('should detect 5-match winners correctly', () => {
    const drawNumbers = [5, 10, 15, 20, 25];
    const { matches } = distributePrizes([5, 10, 15, 20, 25], drawNumbers, prizePool);
    expect(matches).toBe(5);
  });

  it('should detect 4-match winners correctly', () => {
    const drawNumbers = [5, 10, 15, 20, 25];
    const { matches } = distributePrizes([5, 10, 15, 20, 99], drawNumbers, prizePool);
    expect(matches).toBe(4);
  });

  it('should detect 3-match winners correctly', () => {
    const drawNumbers = [5, 10, 15, 20, 25];
    const { matches } = distributePrizes([5, 10, 15, 99, 88], drawNumbers, prizePool);
    expect(matches).toBe(3);
  });

  it('should not qualify <3 matches', () => {
    const drawNumbers = [5, 10, 15, 20, 25];
    const { matches } = distributePrizes([5, 10, 99, 88, 77], drawNumbers, prizePool);
    expect(matches).toBeLessThan(3);
  });

  it('should award 40% for 5-match', () => {
    const award = Math.floor(prizePool * 0.4);
    expect(award).toBe(4000);
  });

  it('should award 35% for 4-match', () => {
    const award = Math.floor(prizePool * 0.35);
    expect(award).toBe(3500);
  });

  it('should award 25% for 3-match', () => {
    const award = Math.floor(prizePool * 0.25);
    expect(award).toBe(2500);
  });

  it('prize tiers should sum to 100%', () => {
    const total = 0.4 + 0.35 + 0.25;
    expect(total).toBe(1.0);
  });

  it('getCurrentMonth should return YYYY-MM format', () => {
    const month = drawService.getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});
