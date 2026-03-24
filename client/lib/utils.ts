import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function getNextDrawDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

export function getCountdownParts(targetDate: Date) {
  const now = new Date();
  const diff = Math.max(targetDate.getTime() - now.getTime(), 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export function getTierLabel(tier: string): { label: string; emoji: string; color: string } {
  switch (tier) {
    case '5-match':
      return { label: 'Jackpot', emoji: '🏆', color: '#c9a84c' };
    case '4-match':
      return { label: '4-Match', emoji: '🥈', color: '#b0b0b0' };
    case '3-match':
      return { label: '3-Match', emoji: '🥉', color: '#cd7f32' };
    default:
      return { label: tier, emoji: '🎯', color: '#fff' };
  }
}

export function getSubscriptionBadge(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'trialing':
      return { label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'past_due':
      return { label: 'Past Due', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    default:
      return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  }
}
