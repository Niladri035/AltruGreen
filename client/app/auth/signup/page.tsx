'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService, charityService, subscriptionService } from '@/services';
import { useAuthStore } from '@/store/useAuthStore';

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type Step1Data = z.infer<typeof step1Schema>;

export default function SignupPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Step1Data & { charityId?: string; plan?: string }>({
    name: '',
    email: '',
    password: '',
  });
  const [charities, setCharities] = useState<any[]>([]);
  const [selectedCharity, setSelectedCharity] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  useEffect(() => {
    charityService.getCharities().then((r) => setCharities(r.data || [])).catch(() => {});
  }, []);

  const onStep1Submit = (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const onStep2Submit = () => {
    if (!selectedCharity) { setError('Please select a charity'); return; }
    setFormData({ ...formData, charityId: selectedCharity });
    setStep(3);
    setError('');
  };

  const onFinalSubmit = async (plan: 'monthly' | 'yearly') => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authService.signup({ ...formData, charityId: selectedCharity });
      setAuth(res.data.user, res.data.token);
      const checkoutRes = await subscriptionService.createCheckout(plan);
      window.location.href = checkoutRes.data.url;
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      setIsLoading(false);
    }
  };

  const steps = ['Your Details', 'Choose Charity', 'Select Plan'];

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold gradient-text inline-block mb-2">
            AltruGreen
          </Link>
          <p className="text-white/50">Create your account</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-brand-gold text-brand-dark' : 'bg-white/10 text-white/30'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block transition-colors ${step === i + 1 ? 'text-brand-gold' : 'text-white/30'}`}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px transition-colors ${step > i + 1 ? 'bg-emerald-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <h2 className="font-display text-2xl font-bold mb-6">Your Details</h2>
              <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-5">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Full Name</label>
                  <input
                    {...register('name')}
                    placeholder="John Smith"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-colors"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-colors"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Password</label>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="Min 8 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-colors"
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold py-3 rounded-xl transition-all"
                >
                  Next →
                </motion.button>
              </form>
              <p className="text-center text-white/40 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-brand-gold hover:text-brand-gold-light">Sign in</Link>
              </p>
            </motion.div>
          )}

          {/* ── Step 2: Charity ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Choose Your Charity</h2>
              <p className="text-white/50 text-sm mb-6">Minimum 10% of your winnings will go directly to your chosen charity.</p>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {charities.map((c) => (
                  <motion.div
                    key={c._id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => { setSelectedCharity(c._id); setError(''); }}
                    className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                      selectedCharity === c._id
                        ? 'border-brand-gold/60 bg-brand-gold/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedCharity === c._id ? 'border-brand-gold' : 'border-white/30'
                      }`}>
                        {selectedCharity === c._id && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-white/40 text-xs line-clamp-1">{c.description}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {charities.length === 0 && (
                  <div className="text-white/30 text-center py-8">No charities available yet</div>
                )}
              </div>

              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all">
                  ← Back
                </button>
                <motion.button
                  onClick={onStep2Submit}
                  whileHover={{ scale: 1.02 }}
                  className="flex-2 bg-brand-gold hover:bg-brand-gold-light text-brand-dark font-bold py-3 px-8 rounded-xl transition-all"
                >
                  Next →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Plan ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Select Your Plan</h2>
              <p className="text-white/50 text-sm mb-6">You can upgrade or cancel anytime.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
              )}

              <div className="space-y-4">
                {[
                  { plan: 'monthly' as const, label: 'Monthly', price: '£9.99/month', desc: 'Flexible, cancel anytime' },
                  { plan: 'yearly' as const, label: 'Yearly', price: '£89.99/year', desc: 'Best value – save 25%', popular: true },
                ].map((p) => (
                  <motion.button
                    key={p.plan}
                    onClick={() => onFinalSubmit(p.plan)}
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-5 rounded-xl text-left border transition-all ${
                      p.popular
                        ? 'border-brand-gold/40 bg-brand-gold/10 hover:bg-brand-gold/15'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {p.label}
                          {p.popular && <span className="text-xs bg-brand-gold text-brand-dark px-2 py-0.5 rounded-full font-bold">Popular</span>}
                        </div>
                        <div className="text-white/50 text-sm">{p.desc}</div>
                      </div>
                      <div className="font-display font-bold gradient-text text-lg">{p.price}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <button onClick={() => setStep(2)} className="w-full mt-4 text-white/40 hover:text-white text-sm transition-colors">
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
