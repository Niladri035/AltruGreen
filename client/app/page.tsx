'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { subscriptionService, charityService } from '@/services';

const STATS = [
  { label: 'Total Donated', value: '£124,800', suffix: '' },
  { label: 'Active Members', value: '2,847', suffix: '+' },
  { label: 'Draws Completed', value: '36', suffix: '' },
  { label: 'Charities Supported', value: '12', suffix: '' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Subscribe',
    desc: 'Choose monthly or yearly plan and join a community of golfers making a difference.',
    icon: '🏌️',
  },
  {
    step: '02',
    title: 'Enter Your Scores',
    desc: 'Log your last 5 Stableford scores (1–45) each month to participate in the draw.',
    icon: '⛳',
  },
  {
    step: '03',
    title: 'Monthly Draw',
    desc: '5 numbers are drawn. Match 3, 4, or all 5 for prizes. Jackpot rolls over if no winner!',
    icon: '🎲',
  },
  {
    step: '04',
    title: 'Give Back',
    desc: 'A portion of every prize goes directly to your chosen charity. Everyone wins.',
    icon: '💚',
  },
];

const PRIZES = [
  { match: '5 Numbers', pct: '40%', label: '🏆 Jackpot', color: '#c9a84c' },
  { match: '4 Numbers', pct: '35%', label: '🥈 2nd Prize', color: '#b0b0b0' },
  { match: '3 Numbers', pct: '25%', label: '🥉 3rd Prize', color: '#cd7f32' },
];

const PRICING = [
  {
    plan: 'monthly' as const,
    label: 'Monthly',
    price: '£9.99',
    period: '/month',
    features: ['12 draws per year', 'All prize tiers', 'Charity donation', 'Score tracking'],
    popular: false,
  },
  {
    plan: 'yearly' as const,
    label: 'Yearly',
    price: '£89.99',
    period: '/year',
    badge: 'Save 25%',
    features: ['12 draws per year', 'All prize tiers', 'Charity donation', 'Score tracking', 'Priority support'],
    popular: true,
  },
];

function AnimatedCounter({ end, duration = 2 }: { end: string; duration?: number }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const numStr = end.replace(/[^0-9.]/g, '');
    const num = parseFloat(numStr);
    if (isNaN(num)) { setDisplay(end); return; }
    const prefix = end.match(/^[^0-9]*/)?.[0] || '';
    const suffix = end.match(/[^0-9]*$/)?.[0] || '';
    let start = 0;
    const step = num / (duration * 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      setDisplay(`${prefix}${start >= 1000 ? start.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : Math.round(start)}${suffix}`);
      if (start >= num) clearInterval(timer);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span ref={ref}>{display}</span>;
}

function FloatingScoreCard({ score, delay, x, y }: { score: number; delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute glass-card px-4 py-2 text-sm font-semibold"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{ delay, duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="text-brand-gold">{score}</span>
      <span className="text-white/50 ml-1 text-xs">pts</span>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [charities, setCharities] = useState<any[]>([]);

  useEffect(() => {
    charityService.getCharities().then((r) => setCharities(r.data || [])).catch(() => {});
  }, []);

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    try {
      const res = await subscriptionService.createCheckout(plan);
      window.location.href = res.data.url;
    } catch {
      window.location.href = '/auth/signup';
    }
  };

  return (
    <main className="min-h-screen mesh-bg">
      {/* ─── NAV ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/5">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold gradient-text">AltruGreen</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <Link href="/auth/login" className="text-white/70 hover:text-white text-sm transition-colors px-3 py-2">
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-mid/40 rounded-full blur-3xl" />
        </div>

        {/* Floating score cards */}
        <FloatingScoreCard score={34} delay={0.5} x="8%" y="30%" />
        <FloatingScoreCard score={28} delay={1.0} x="78%" y="25%" />
        <FloatingScoreCard score={41} delay={1.5} x="85%" y="60%" />
        <FloatingScoreCard score={22} delay={0.8} x="5%" y="65%" />

        <motion.div style={{ y, opacity }} className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 text-sm text-brand-gold mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Monthly draw now open — Enter your scores
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              Play Golf.{' '}
              <span className="gradient-text">Win Big.</span>
              <br />
              Change Lives.
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join thousands of golfers who compete in monthly draws while their chosen charity receives a guaranteed donation — every single month.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => handleCheckout('monthly')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-gold w-full sm:w-auto"
              >
                Start Free Trial →
              </motion.button>
              <Link
                href="#how-it-works"
                className="glass-card text-white/80 hover:text-white font-medium text-base px-8 py-4 rounded-xl transition-all duration-200 w-full sm:w-auto text-center"
              >
                How It Works ↓
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-brand-gold rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ─── STATS ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 text-center"
            >
              <div className="font-display text-3xl md:text-4xl font-bold gradient-text">
                <AnimatedCounter end={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-white/50 text-sm mt-2">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Four simple steps to play, win, and give back.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-6 relative group hover:border-brand-gold/30 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="text-brand-gold/40 font-display font-bold text-xs tracking-widest mb-3">
                  STEP {item.step}
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRIZE POOL ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-black/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Prize Pool Distribution</h2>
            <p className="text-white/50 text-lg">Match more numbers, win bigger. Jackpot rolls over if no 5-match winner!</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRIZES.map((prize, i) => (
              <motion.div
                key={prize.match}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-8 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at center, ${prize.color}, transparent)` }} />
                <div className="text-4xl mb-4">{prize.label.split(' ')[0]}</div>
                <div className="font-display text-6xl font-bold mb-2" style={{ color: prize.color }}>
                  {prize.pct}
                </div>
                <div className="text-white/70 font-semibold text-lg mb-2">{prize.label.split(' ').slice(1).join(' ')}</div>
                <div className="text-white/40 text-sm">{prize.match} matched</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass-card-gold mt-8 p-6 text-center"
          >
            <span className="text-brand-gold font-semibold">🎰 Jackpot Rollover: </span>
            <span className="text-white/70">If no 5-match winner, the jackpot prize rolls over and adds to next month's pool!</span>
          </motion.div>
        </div>
      </section>

      {/* ─── CHARITIES ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Supporting Amazing Causes</h2>
            <p className="text-white/50 text-lg">Choose your charity at signup. Minimum 10% of your winnings goes directly to them.</p>
          </motion.div>

          {charities.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {charities.slice(0, 6).map((charity, i) => (
                <motion.div
                  key={charity._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 hover:border-brand-gold/30 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-mid/50 flex items-center justify-center mb-4 text-2xl">
                    {charity.logoUrl ? '🌿' : '💚'}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-brand-gold transition-colors">{charity.name}</h3>
                  <p className="text-white/50 text-sm line-clamp-2 mb-4">{charity.description}</p>
                  <div className="text-brand-gold text-sm font-semibold">
                    £{(charity.totalDonated / 100).toFixed(0)} donated
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/40">Charities will be displayed here once loaded.</div>
          )}
        </div>
      </section>

      {/* ─── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-black/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-white/50 text-lg">No hidden fees. Cancel anytime.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {PRICING.map((p, i) => (
              <motion.div
                key={p.plan}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`relative glass-card p-8 ${p.popular ? 'border-brand-gold/40 glow-gold' : ''}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-brand-dark text-xs font-bold px-4 py-1 rounded-full">
                    {p.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display text-xl font-bold mb-2">{p.label}</h3>
                  <div className="flex items-end gap-1">
                    <span className="font-display text-5xl font-bold gradient-text">{p.price}</span>
                    <span className="text-white/40 mb-2">{p.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                      <span className="text-brand-gold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <motion.button
                  onClick={() => handleCheckout(p.plan)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                    p.popular
                      ? 'bg-brand-gold hover:bg-brand-gold-light text-brand-dark'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  Get Started →
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-display text-xl font-bold gradient-text mb-1">AltruGreen</div>
            <div className="text-white/40 text-sm">Play Golf. Win Big. Change Lives.</div>
          </div>
          <div className="flex gap-6 text-white/40 text-sm">
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/auth/signup" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="text-white/30 text-xs">
            © {new Date().getFullYear()} AltruGreen. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
