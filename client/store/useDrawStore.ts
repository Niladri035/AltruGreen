import { create } from 'zustand';

export interface DrawNumbers {
  drawNumbers: number[];
  month: string;
  prizePool: number;
  rolloverAmount: number;
  totalEntries: number;
  status: 'pending' | 'simulated' | 'executed' | 'cancelled';
  winnersSnapshot: Array<{
    userId: string;
    name: string;
    matchCount: number;
    prizeAmount: number;
  }>;
}

interface DrawState {
  currentDraw: DrawNumbers | null;
  history: DrawNumbers[];
  isLoading: boolean;
  simulationResult: any | null;
  setCurrentDraw: (draw: DrawNumbers) => void;
  setHistory: (history: DrawNumbers[]) => void;
  setSimulationResult: (result: any) => void;
  setLoading: (loading: boolean) => void;
  clearSimulation: () => void;
}

export const useDrawStore = create<DrawState>((set) => ({
  currentDraw: null,
  history: [],
  isLoading: false,
  simulationResult: null,
  setCurrentDraw: (currentDraw) => set({ currentDraw }),
  setHistory: (history) => set({ history }),
  setSimulationResult: (simulationResult) => set({ simulationResult }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSimulation: () => set({ simulationResult: null }),
}));
