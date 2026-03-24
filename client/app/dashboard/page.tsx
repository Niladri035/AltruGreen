'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { scoreService, drawService, winnerService, subscriptionService } from '@/services';
import { formatCurrency, getNextDrawDate, getCountdownParts, getTierLabel, getSubscriptionBadge } from '@/lib/utils';

function Countdown() {
  const [parts, setParts] = useState(getCountdownParts(getNextDrawDate()));
  useEffect(() => {
    const t = setInterval(() => setParts(getCountdownParts(getNextDrawDate())), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex gap-4">
      {Object.entries(parts).map(([unit, val]) => (
        <div key={unit} className="text-center">
          <div className="font-display text-3xl font-bold gradient-text">{String(val).padStart(2, '0')}</div>
          <div className="text-white/40 text-xs uppercase tracking-widest">{unit}</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [scores, setScores] = useState<any[]>([]);
  const [winnings, setWinnings] = useState<any[]>([]);
  const [currentDraw, setCurrentDraw] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [scoreSuccess, setScoreSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<{ [id: string]: File }>({});
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    Promise.all([
      scoreService.getScores().then((r) => setScores(r.data?.scores || [])),
      winnerService.getMyWinnings().then((r) => setWinnings(r.data || [])),
      drawService.getCurrentDraw().then((r) => setCurrentDraw(r.data)),
      subscriptionService.getStatus().then((r) => setSubStatus(r.data)),
    ]).catch(() => {});
  }, [isAuthenticated, router]);

  const handleAddScore = async () => {
    const val = parseInt(scoreInput);
    if (isNaN(val) || val < 1 || val > 45) {
      setScoreError('Score must be between 1 and 45');
      return;
    }
    setIsSubmitting(true);
    setScoreError('');
    try {
      const res = await scoreService.addScore(val);
      setScores(res.data?.scores || []);
      setScoreInput('');
      setScoreSuccess('Score added successfully!');
      setTimeout(() => setScoreSuccess(''), 3000);
    } catch (err: any) {
      setScoreError(err.message || 'Failed to add score');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadProof = async (winnerId: string) => {
    const file = proofFile[winnerId];
    if (!file) return;
    try {
      await winnerService.uploadProof(winnerId, file);
      const res = await winnerService.getMyWinnings();
      setWinnings(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  const handlePortal = async () => {
    const res = await subscriptionService.createPortal();
    window.location.href = res.data.url;
  };

  const badge = getSubscriptionBadge(user?.subscriptionStatus || 'inactive');

  const NAV = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'scores', label: '⛳ Scores' },
    { id: 'winnings', label: '🏆 Winnings' },
    { id: 'subscription', label: '💳 Subscription' },
  ];

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 p-6 border-r border-white/5 fixed left-0 top-0 bottom-0">
        <Link href="/" className="font-display text-xl font-bold gradient-text mb-10 block">
          AltruGreen
        </Link>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveSection(n.id)}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSection === n.id
                  ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {n.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin" className="px-4 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5">
              🛠 Admin Panel
            </Link>
          )}
        </nav>
        <div className="border-t border-white/5 pt-4">
          <div className="text-white/70 text-sm font-medium mb-1">{user?.name}</div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${badge.color} mb-3`}>
            {badge.label}
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="text-white/40 hover:text-white text-xs transition-colors block">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* ── Overview ── */}
          {activeSection === 'overview' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
              <p className="text-white/50 mb-8">Here's your account at a glance.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Subscription */}
                <div className="glass-card p-6">
                  <div className="text-white/50 text-sm mb-2">Subscription</div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${badge.color}`}>
                    {badge.label}
                  </div>
                  {subStatus?.subscription && (
                    <div className="text-white/40 text-xs mt-2">
                      Renews {new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
                {/* Scores */}
                <div className="glass-card p-6">
                  <div className="text-white/50 text-sm mb-2">Your Scores</div>
                  <div className="font-display text-3xl font-bold gradient-text">{scores.length}/5</div>
                  <div className="text-white/40 text-xs mt-1">scores entered</div>
                </div>
                {/* Next draw countdown */}
                <div className="glass-card p-6 md:col-span-2 lg:col-span-1">
                  <div className="text-white/50 text-sm mb-3">Next Draw</div>
                  <Countdown />
                </div>
              </div>
              {/* Draw info */}
              {currentDraw && (
                <div className="glass-card-gold p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-brand-gold font-semibold">Current Prize Pool</div>
                      <div className="font-display text-4xl font-bold mt-1">
                        {formatCurrency(currentDraw.prizePool + currentDraw.rolloverAmount)}
                      </div>
                      {currentDraw.rolloverAmount > 0 && (
                        <div className="text-white/40 text-xs mt-1">
                          Includes {formatCurrency(currentDraw.rolloverAmount)} rollover 🎰
                        </div>
                      )}
                    </div>
                    <div className="text-6xl">🏆</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Scores ── */}
          {activeSection === 'scores' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">Your Scores ⛳</h1>
              <p className="text-white/50 mb-8">Enter Stableford scores (1–45). Only your latest 5 are kept.</p>

              {user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing' ? (
                <div className="glass-card p-6 mb-6">
                  <h3 className="font-semibold mb-4">Add New Score</h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      placeholder="Enter score (1-45)"
                      min={1}
                      max={45}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-colors"
                    />
                    <motion.button
                      onClick={handleAddScore}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Add'}
                    </motion.button>
                  </div>
                  {scoreError && <p className="text-red-400 text-xs mt-2">{scoreError}</p>}
                  {scoreSuccess && <p className="text-emerald-400 text-xs mt-2">{scoreSuccess}</p>}
                </div>
              ) : (
                <div className="glass-card p-6 mb-6 border-amber-500/20">
                  <p className="text-amber-400">
                    You need an active subscription to enter scores.{' '}
                    <button onClick={() => setActiveSection('subscription')} className="underline">View subscription →</button>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {scores.length === 0 ? (
                  <div className="text-white/30 text-center py-12">No scores entered yet.</div>
                ) : (
                  scores.map((score: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center font-bold text-brand-gold">
                          {score.value}
                        </div>
                        <div>
                          <div className="font-semibold">{score.value} pts</div>
                          <div className="text-white/40 text-xs">
                            {new Date(score.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      {i === 0 && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Latest</span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Winnings ── */}
          {activeSection === 'winnings' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">Your Winnings 🏆</h1>
              <p className="text-white/50 mb-8">Upload proof of your score card to claim prizes.</p>
              {winnings.length === 0 ? (
                <div className="glass-card p-12 text-center text-white/30">
                  <div className="text-5xl mb-4">🎲</div>
                  No winnings yet. Keep entering scores to participate!
                </div>
              ) : (
                <div className="space-y-4">
                  {winnings.map((w: any) => {
                    const tier = getTierLabel(w.tier);
                    const statusColors: Record<string, string> = {
                      pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                      approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                      rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
                    };
                    return (
                      <motion.div
                        key={w._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-display text-xl font-bold flex items-center gap-2">
                              {tier.emoji} {tier.label}
                            </div>
                            <div className="text-white/40 text-sm">{w.drawId?.month}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-2xl gradient-text font-bold">{formatCurrency(w.prizeAmount)}</div>
                            <div className={`text-xs px-2 py-1 rounded-full border mt-1 ${statusColors[w.verificationStatus]}`}>
                              {w.verificationStatus}
                            </div>
                          </div>
                        </div>
                        {w.charityDonationAmount > 0 && (
                          <div className="text-emerald-400 text-sm mb-4">
                            💚 {formatCurrency(w.charityDonationAmount)} donated to {w.charityId?.name || 'your charity'}
                          </div>
                        )}
                        {w.verificationStatus === 'pending' && !w.proofImageUrl && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-white/50 text-sm mb-3">Upload your score card to claim this prize:</p>
                            <div className="flex gap-3">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && setProofFile((p) => ({ ...p, [w._id]: e.target.files![0] }))}
                                className="text-white/50 text-sm file:bg-white/10 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-lg file:cursor-pointer"
                              />
                              <motion.button
                                onClick={() => handleUploadProof(w._id)}
                                whileHover={{ scale: 1.02 }}
                                disabled={!proofFile[w._id]}
                                className="bg-brand-gold text-brand-dark font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
                              >
                                Upload
                              </motion.button>
                            </div>
                          </div>
                        )}
                        {w.proofImageUrl && <p className="text-emerald-400 text-xs">✓ Proof submitted</p>}
                        {w.adminNotes && w.verificationStatus === 'rejected' && (
                          <p className="text-red-400 text-xs mt-2">Note: {w.adminNotes}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Subscription ── */}
          {activeSection === 'subscription' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">Subscription 💳</h1>
              <p className="text-white/50 mb-8">Manage your plan and billing.</p>
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-white/50 text-sm mb-1">Current Plan</div>
                    <div className="font-display text-2xl font-bold">
                      {subStatus?.subscription?.plan === 'yearly' ? 'Yearly' : 'Monthly'}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border text-sm ${badge.color}`}>{badge.label}</div>
                </div>
                {subStatus?.subscription && (
                  <div className="space-y-3 text-sm mb-8">
                    <div className="flex justify-between text-white/60">
                      <span>Current period ends</span>
                      <span>{new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    {subStatus.subscription.cancelAtPeriodEnd && (
                      <div className="text-amber-400 text-xs">⚠️ Your subscription will cancel at the end of the current period.</div>
                    )}
                  </div>
                )}
                <motion.button
                  onClick={handlePortal}
                  whileHover={{ scale: 1.02 }}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  Manage Billing & Subscription →
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
