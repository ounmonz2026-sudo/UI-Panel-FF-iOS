import React, { useState } from 'react';
import { User } from '../types';

interface AuthScreenProps {
    onAuthSuccess: (user: User) => void;
}

type AuthMethod = 'email' | 'phone';
type AuthMode = 'login' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
    const [method, setMethod] = useState<AuthMethod>('email');
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState<'idle' | 'google' | 'credential'>('idle');
    
    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);

    const triggerHaptic = (type: 'light' | 'success' | 'error') => {
        if (!navigator.vibrate) return;
        try {
            if (type === 'light') navigator.vibrate(10);
            if (type === 'success') navigator.vibrate([10, 30, 10]);
            if (type === 'error') navigator.vibrate([50]);
        } catch (e) { /* ignore */ }
    };

    const handleGoogleLogin = () => {
        triggerHaptic('light');
        setLoading('google');
        setError(null);

        // SIMULATED GOOGLE AUTH
        setTimeout(() => {
            const mockUser: User = {
                id: 'google_123456',
                name: 'FF_Gamer_Google',
                method: 'google',
                avatar: 'G'
            };
            triggerHaptic('success');
            onAuthSuccess(mockUser);
        }, 2000);
    };

    const handleCredentialAuth = (e: React.FormEvent) => {
        e.preventDefault();
        triggerHaptic('light');
        setError(null);

        // Basic Validation
        if (method === 'email' && (!email.includes('@') || password.length < 6)) {
            setError("Invalid email or password too short.");
            triggerHaptic('error');
            return;
        }
        if (method === 'phone' && phone.length < 8) {
             setError("Invalid phone number.");
             triggerHaptic('error');
             return;
        }

        setLoading('credential');

        // SIMULATED BACKEND CALL
        setTimeout(() => {
            const mockUser: User = {
                id: `${method}_${Date.now()}`,
                name: method === 'email' ? email.split('@')[0] : `User_${phone.slice(-4)}`,
                method: method,
                avatar: method === 'email' ? email[0].toUpperCase() : 'P'
            };
            triggerHaptic('success');
            onAuthSuccess(mockUser);
        }, 2500);
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden safe-top safe-bottom">
             {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[50%] bg-red-600/10 blur-[120px] rounded-full opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[0%] left-[-20%] w-[70%] h-[40%] bg-yellow-600/10 blur-[100px] rounded-full opacity-40"></div>
            </div>

            <div className="flex-1 z-10 flex flex-col justify-center px-6 sm:px-12 lg:px-8 overflow-y-auto no-scrollbar">
                <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center shrink-0 pt-6">
                     {/* Logo / Branding */}
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-3xl shadow-2xl shadow-red-500/20 mb-6 relative">
                        <div className="absolute inset-0 border border-white/20 rounded-3xl"></div>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white drop-shadow-lg">
                          <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.004c-.148.115-.295.226-.442.335-.157.117-.314.23-.472.34-1.295.904-2.739 1.64-4.306 2.153a3.495 3.495 0 01-1.887-.297l-.519-.26a.38.38 0 00-.457.085l-.588.588a.38.38 0 00.085.457l.26.519c.203.405.303.856.297 1.31a3.488 3.488 0 00-2.153 4.306c-.11.157-.223.315-.34.472-.108.148-.22.294-.335.442v-.004c-2.881 3.701-7.38 6.084-12.436 6.084a.75.75 0 01-.75-.75c0-5.055 2.383-9.555 6.084-12.436h-.004c.148-.115.295-.226.442-.335.157-.117.314-.23.472-.34 1.295-.904 2.739-1.64 4.306-2.153a3.494 3.494 0 011.31-.297 3.495 3.495 0 01.577.046l.519.26c.149.075.326.044.457-.085l.588-.588a.38.38 0 00-.085-.457l-.26-.519a3.495 3.495 0 00-.297-1.31 3.489 3.489 0 002.153-4.306c.11-.157.223-.315.34-.472.108-.148.22-.294.335-.442v.004z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                        Command<span className="text-yellow-500">Center</span>
                    </h2>
                    <p className="mt-2 text-center text-sm text-zinc-400 font-medium">
                        Sign in to sync your configs
                    </p>
                </div>

                <div className="bg-zinc-900/60 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-white/5 sm:px-10 shrink-0 mb-6">
                    {/* Auth Method Tabs */}
                    <div className="flex p-1 bg-zinc-950/80 rounded-xl mb-8 border border-zinc-800/50">
                        <button
                            onClick={() => { setMethod('email'); setError(null); triggerHaptic('light'); }}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${method === 'email' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                        >
                            Email
                        </button>
                        <button
                            onClick={() => { setMethod('phone'); setError(null); triggerHaptic('light'); }}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${method === 'phone' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                        >
                            Phone
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={handleCredentialAuth}>
                        {method === 'email' ? (
                            <>
                                <div>
                                    <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1">Email address</label>
                                    <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-black/40 border-2 border-zinc-800 focus:border-yellow-500 text-base text-white rounded-xl py-3 px-4 outline-none transition-all placeholder-zinc-700"
                                        placeholder="pro.player@example.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1">Password</label>
                                    <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-black/40 border-2 border-zinc-800 focus:border-yellow-500 text-base text-white rounded-xl py-3 px-4 outline-none transition-all placeholder-zinc-700"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label htmlFor="phone" className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1">Phone Number</label>
                                <input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                                    className="w-full bg-black/40 border-2 border-zinc-800 focus:border-yellow-500 text-white rounded-xl py-3 px-4 outline-none transition-all placeholder-zinc-700 text-lg tracking-widest"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg animate-pulse border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading !== 'idle'}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold uppercase tracking-widest text-black bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all active:scale-95 ${loading !== 'idle' ? 'opacity-70 cursor-wait' : ''}`}>
                            {loading === 'credential' ? (
                                <svg className="animate-spin h-5 w-5 text-black/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-4 bg-zinc-900 text-zinc-500 font-bold tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3">
                            <button onClick={handleGoogleLogin} disabled={loading !== 'idle'}
                                className="w-full inline-flex justify-center items-center py-3 px-4 rounded-2xl shadow-sm bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 transition-all active:scale-95 relative overflow-hidden">
                                {loading === 'google' && (
                                     <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                         <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                     </div>
                                )}
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="font-bold">Google</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toggle Login/Signup Mode */}
                <div className="mb-8 text-center shrink-0">
                     <p className="text-zinc-500 text-sm">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button 
                            onClick={() => {
                                setMode(mode === 'login' ? 'signup' : 'login');
                                setError(null);
                                triggerHaptic('light');
                            }}
                            className="ml-2 font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                        >
                            {mode === 'login' ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};