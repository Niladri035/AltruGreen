import { create } from 'zustand';

export interface Charity {
  _id: string;
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  totalDonated: number;
  memberCount: number;
  isActive: boolean;
}

interface CharityState {
  charities: Charity[];
  isLoading: boolean;
  setCharities: (charities: Charity[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useCharityStore = create<CharityState>((set) => ({
  charities: [],
  isLoading: false,
  setCharities: (charities) => set({ charities }),
  setLoading: (isLoading) => set({ isLoading }),
}));
