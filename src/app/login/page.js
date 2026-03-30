'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Append domain if not present
        const fullEmail = email.includes('@') ? email : `${email}@repkon.com.tr`

        try {
            // Supabase Auth Login
            const { data, error: sbError } = await supabase.auth.signInWithPassword({
                email: fullEmail,
                password
            })

            if (data?.user) {
                // Success: Redirect to dashboard
                window.location.href = '/'
                return
            } else {
                setError(sbError?.message || 'Kullanıcı adı veya şifre hatalı.')
            }
        } catch (err) {
            setError('Sistem hatası. Lütfen bağlantınızı kontrol edin.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at center, #1a1a1a 0%, #09090b 100%)' }}>
            <div className="card animate-fade-in" style={{ width: '400px', padding: '3rem', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>RMK Tracker</h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Lütfen hesabınıza giriş yapın</p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Kullanıcı Adı</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--muted-foreground)' }} />
                            <input
                                required
                                type="text"
                                style={{
                                    width: '100%',
                                    background: 'var(--secondary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    padding: '0.75rem 8.5rem 0.75rem 2.5rem',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                                value={email}
                                onChange={e => setEmail(e.target.value.split('@')[0].toLowerCase())}
                                placeholder="ad.soyad"
                            />
                            <span style={{
                                position: 'absolute',
                                right: '0.75rem',
                                color: 'var(--muted-foreground)',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                opacity: 0.7
                            }}>
                                @repkon.com.tr
                            </span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Şifre</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.75rem 3rem 0.75rem 2.5rem', outline: 'none' }}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder=""
                            />
                            <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button disabled={loading} className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '1rem' }}>
                        {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'} <LogIn size={18} style={{ marginLeft: '0.5rem' }} />
                    </button>
                </form>


                <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Varsayılan şifre ile giriş yaptıktan sonra şifrenizi profil ayarlarından güncelleyebilirsiniz.
                </p>
            </div>
        </div>
    )
}
