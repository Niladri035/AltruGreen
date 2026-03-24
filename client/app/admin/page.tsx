'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService, drawService, winnerService, charityService } from '@/services';
import { formatCurrency, formatMonth } from '@/lib/utils';

const GOLD_COLORS = ['#c9a84c', '#e8c97a', '#1a4d2e', '#2d7a4a', '#b8860b', '#daa520'];

const NAV_ITEMS = [
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'users', label: '👥 Users' },
  { id: 'draws', label: '🎲 Draw Control' },
  { id: 'charities', label: '💚 Charities' },
  { id: 'winners', label: '✅ Verifications' },
];

export default function AdminDashboard() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('analytics');
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [charityData, setCharityData] = useState<any[]>([]);
  const [drawData, setDrawData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [currentDraw, setCurrentDraw] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [drawType, setDrawType] = useState<'random' | 'algorithm'>('random');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [winnerFilter, setWinnerFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [charityForm, setCharityForm] = useState({ name: '', description: '', websiteUrl: '' });
  const [charityError, setCharityError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/auth/login');
      return;
    }
    loadAnalytics();
    loadUsers();
    loadWinners();
    loadCharities();
    drawService.getCurrentDraw().then((r) => setCurrentDraw(r.data)).catch(() => {});
  }, [isAuthenticated, user, router]);

  const loadAnalytics = () => {
    Promise.all([
      adminService.getAnalytics().then((r) => setMetrics(r.data)),
      adminService.getRevenue().then((r) => setRevenueData(r.data || [])),
      adminService.getCharityBreakdown().then((r) => setCharityData(r.data || [])),
      adminService.getDrawParticipation().then((r) => setDrawData(r.data || [])),
    ]).catch(() => {});
  };

  const loadUsers = (search?: string) => {
    adminService.getUsers(1, search).then((r) => setUsers(r.data?.users || [])).catch(() => {});
  };

  const loadWinners = () => {
    winnerService.getAllWinners({ status: winnerFilter || undefined }).then((r) => setWinners(r.data?.winners || [])).catch(() => {});
  };

  const loadCharities = () => {
    charityService.getCharities().then((r) => setCharities(r.data || [])).catch(() => {});
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await drawService.simulate(drawType);
      setSimulationResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecute = async () => {
    if (!confirm('Are you sure you want to execute the draw? This cannot be undone.')) return;
    setIsExecuting(true);
    try {
      const res = await drawService.execute(drawType);
      alert(`Draw executed! ${res.data.totalWinners} winners found.`);
      setSimulationResult(null);
      drawService.getCurrentDraw().then((r) => setCurrentDraw(r.data));
    } catch (err: any) {
      alert(err.message || 'Draw execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleVerify = async (winnerId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await winnerService.verifyWinner(winnerId, status, notes);
      loadWinners();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleCreateCharity = async () => {
    if (!charityForm.name || !charityForm.description) {
      setCharityError('Name and description required');
      return;
    }
    try {
      await charityService.createCharity(charityForm);
      setCharityForm({ name: '', description: '', websiteUrl: '' });
      setCharityError('');
      loadCharities();
    } catch (err: any) {
      setCharityError(err.message || 'Failed to create charity');
    }
  };

  const handleDeleteCharity = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    await charityService.deleteCharity(id);
    loadCharities();
  };

  const handleUpdateUserSub = async (id: string, status: string) => {
    await adminService.updateUserSubscription(id, status);
    loadUsers(userSearch);
  };

  const KPI_CARDS = metrics
    ? [
        { label: 'Total Users', value: metrics.totalUsers, icon: '👥' },
        { label: 'Active Subscribers', value: metrics.activeSubscribers, icon: '✅' },
        { label: 'Total Revenue', value: formatCurrency(metrics.totalRevenue), icon: '💰' },
        { label: 'Total Donated', value: formatCurrency(metrics.totalDonated), icon: '💚' },
        { label: 'Draws Run', value: metrics.totalDraws, icon: '🎲' },
        { label: 'Charities', value: metrics.charitiesCount, icon: '🌿' },
      ]
    : [];

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 p-6 border-r border-white/5 fixed left-0 top-0 bottom-0">
        <Link href="/" className="font-display text-xl font-bold gradient-text mb-10 block">
          AltruGreen <span className="text-xs text-white/30 font-sans">Admin</span>
        </Link>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map((n) => (
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
          <Link href="/dashboard" className="mt-4 text-xs text-white/30 hover:text-white transition-colors px-4">
            ← User Dashboard
          </Link>
        </nav>
        <div className="border-t border-white/5 pt-4">
          <div className="text-white/70 text-sm">{user?.name}</div>
          <button onClick={() => { logout(); router.push('/'); }} className="text-white/40 hover:text-white text-xs transition-colors mt-1 block">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── Analytics ── */}
          {activeSection === 'analytics' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-8">Analytics Dashboard 📊</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {KPI_CARDS.map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-5"
                  >
                    <div className="text-2xl mb-2">{kpi.icon}</div>
                    <div className="font-display text-2xl font-bold gradient-text">{kpi.value}</div>
                    <div className="text-white/50 text-xs mt-1">{kpi.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Revenue chart */}
              {revenueData.length > 0 && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="font-semibold mb-4">Monthly Revenue (pence)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#0a2416', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#fff' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Charity breakdown */}
                {charityData.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold mb-4">Charity Donations</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={charityData} dataKey="totalDonated" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                          {charityData.map((_, idx) => (
                            <Cell key={idx} fill={GOLD_COLORS[idx % GOLD_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0a2416', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Draw participation */}
                {drawData.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold mb-4">Draw Participation</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={drawData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0a2416', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="totalEntries" fill="#1a4d2e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {activeSection === 'users' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-6">User Management 👥</h1>
              <div className="flex gap-3 mb-6">
                <input
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); loadUsers(e.target.value); }}
                  placeholder="Search by name or email..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
                />
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr>
                      {['Name', 'Email', 'Plan', 'Status', 'Joined', 'Actions'].map((h) => (
                        <th key={h} className="text-left text-white/40 font-medium px-4 py-3 text-xs uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-white/50">{u.email}</td>
                        <td className="px-4 py-3 text-white/50 capitalize">{u.subscriptionStatus}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40">{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={u.subscriptionStatus}
                            onChange={(e) => handleUpdateUserSub(u._id, e.target.value)}
                            className="bg-white/5 border border-white/10 text-xs text-white rounded-lg px-2 py-1"
                          >
                            {['active', 'inactive', 'cancelled', 'past_due'].map((s) => (
                              <option key={s} value={s} className="bg-gray-900">{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="text-white/30 text-center py-12">No users found</div>}
              </div>
            </div>
          )}

          {/* ── Draw Control ── */}
          {activeSection === 'draws' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-6">Draw Control 🎲</h1>
              {currentDraw && (
                <div className="glass-card-gold p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-brand-gold font-semibold">{formatMonth(currentDraw.month)} Draw</div>
                      <div className="font-display text-4xl font-bold">{formatCurrency(currentDraw.prizePool + currentDraw.rolloverAmount)}</div>
                      <div className="text-white/40 text-sm">Status: <span className="capitalize">{currentDraw.status}</span></div>
                    </div>
                    {currentDraw.rolloverAmount > 0 && (
                      <div className="text-right">
                        <div className="text-white/40 text-xs">Includes rollover</div>
                        <div className="text-brand-gold font-bold">{formatCurrency(currentDraw.rolloverAmount)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold mb-4">Draw Configuration</h3>
                <div className="flex gap-3 mb-4">
                  {(['random', 'algorithm'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDrawType(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                        drawType === t ? 'bg-brand-gold text-brand-dark' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {t === 'random' ? '🎲 Random' : '🧮 Algorithm'} Draw
                    </button>
                  ))}
                </div>
                <p className="text-white/40 text-xs mb-4">
                  {drawType === 'random'
                    ? 'Uses cryptographically secure random number generation.'
                    : 'Uses a weighted probability distribution based on score frequency across all users.'}
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isSimulating ? 'Simulating...' : '🔍 Simulate Draw'}
                  </motion.button>
                  <motion.button
                    onClick={handleExecute}
                    disabled={isExecuting || currentDraw?.status === 'executed'}
                    whileHover={{ scale: 1.02 }}
                    className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isExecuting ? 'Executing...' : currentDraw?.status === 'executed' ? '✓ Draw Executed' : '⚡ Execute Draw'}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {simulationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Simulation Preview</h3>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/20">Not saved</span>
                    </div>
                    <div className="flex gap-3 mb-4 flex-wrap">
                      {simulationResult.drawNumbers.map((n: number) => (
                        <div key={n} className="w-12 h-12 rounded-full border-2 border-brand-gold/50 flex items-center justify-center font-bold text-brand-gold">
                          {n}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/50 text-sm">Prize Pool: {formatCurrency(simulationResult.prizePool)}</div>
                      <div className="text-white/50 text-sm">Entries: {simulationResult.totalEntries}</div>
                      <div className="text-white/50 text-sm">
                        Winners: {simulationResult.tierCounts.five} jackpot / {simulationResult.tierCounts.four} 4-match / {simulationResult.tierCounts.three} 3-match
                      </div>
                      {!simulationResult.hasJackpotWinner && (
                        <div className="text-amber-400 text-sm">⚠️ No jackpot winner — prize will rollover to next month</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Charities ── */}
          {activeSection === 'charities' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-6">Charity Management 💚</h1>
              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold mb-4">Add New Charity</h3>
                <div className="space-y-3">
                  <input
                    value={charityForm.name}
                    onChange={(e) => setCharityForm({ ...charityForm, name: e.target.value })}
                    placeholder="Charity name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
                  />
                  <textarea
                    value={charityForm.description}
                    onChange={(e) => setCharityForm({ ...charityForm, description: e.target.value })}
                    placeholder="Description"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 resize-none"
                  />
                  <input
                    value={charityForm.websiteUrl}
                    onChange={(e) => setCharityForm({ ...charityForm, websiteUrl: e.target.value })}
                    placeholder="Website URL (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
                  />
                  {charityError && <p className="text-red-400 text-xs">{charityError}</p>}
                  <motion.button
                    onClick={handleCreateCharity}
                    whileHover={{ scale: 1.02 }}
                    className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold px-6 py-2 rounded-xl transition-all"
                  >
                    Add Charity
                  </motion.button>
                </div>
              </div>
              <div className="space-y-4">
                {charities.map((c: any) => (
                  <div key={c._id} className="glass-card p-5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {c.name}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-white/40 text-sm mt-1 line-clamp-1">{c.description}</div>
                      <div className="text-brand-gold text-xs mt-1">{formatCurrency(c.totalDonated)} donated • {c.memberCount} members</div>
                    </div>
                    {c.isActive && (
                      <button
                        onClick={() => handleDeleteCharity(c._id, c.name)}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Winner Verification ── */}
          {activeSection === 'winners' && (
            <div>
              <h1 className="font-display text-3xl font-bold mb-6">Winner Verification ✅</h1>
              <div className="flex gap-2 mb-6">
                {(['', 'pending', 'approved', 'rejected'] as const).map((f) => (
                  <button
                    key={f || 'all'}
                    onClick={() => { setWinnerFilter(f); loadWinners(); }}
                    className={`px-4 py-2 rounded-xl text-sm transition-all capitalize ${
                      winnerFilter === f ? 'bg-brand-gold text-brand-dark font-semibold' : 'glass-card text-white/50 hover:text-white'
                    }`}
                  >
                    {f || 'All'}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {winners.length === 0 && (
                  <div className="glass-card p-12 text-center text-white/30">No winners in this status</div>
                )}
                {winners.map((w: any) => {
                  const [notes, setNotes] = useState('');
                  return (
                    <div key={w._id} className="glass-card p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-semibold">{w.userId?.name}</div>
                          <div className="text-white/40 text-sm">{w.userId?.email}</div>
                          <div className="text-brand-gold text-sm mt-1">{w.tier} — {formatCurrency(w.prizeAmount)}</div>
                          <div className="text-white/40 text-xs">{w.drawId?.month}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border capitalize ${
                          w.verificationStatus === 'pending' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                          w.verificationStatus === 'approved' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
                          'text-red-400 border-red-400/30 bg-red-400/10'
                        }`}>
                          {w.verificationStatus}
                        </span>
                      </div>
                      {w.proofImageUrl ? (
                        <div className="mb-4">
                          <a href={w.proofImageUrl} target="_blank" rel="noopener noreferrer" className="text-brand-gold text-sm hover:underline">
                            📎 View proof image
                          </a>
                        </div>
                      ) : (
                        <p className="text-white/30 text-sm mb-4">No proof uploaded yet</p>
                      )}
                      {w.verificationStatus === 'pending' && w.proofImageUrl && (
                        <div className="flex gap-3 items-center flex-wrap">
                          <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Admin notes (optional)"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
                          />
                          <motion.button
                            onClick={() => handleVerify(w._id, 'approved', notes)}
                            whileHover={{ scale: 1.02 }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                          >
                            ✓ Approve
                          </motion.button>
                          <motion.button
                            onClick={() => handleVerify(w._id, 'rejected', notes)}
                            whileHover={{ scale: 1.02 }}
                            className="bg-red-500/80 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                          >
                            ✗ Reject
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
