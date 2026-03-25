'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle2, CloudUpload } from 'lucide-react'

function BootstrapForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [status, setStatus] = useState('ready')
    const [user, setUser] = useState(null)
    const [error, setError] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const qEmail = searchParams.get('email')
        const qFullName = searchParams.get('fullName')

        if (qEmail) setEmail(qEmail)
        if (qFullName) setFullName(qFullName)
    }, [searchParams])

    const handleBootstrap = async (e) => {
        e.preventDefault()
        setStatus('loading')
        setError('')

        try {
            // 1. Create User in Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            })

            if (authError) throw authError

            const newUser = authData.user
            if (!newUser) throw new Error('Kullanıcı oluşturulamadı.')

            // 2. Ensure Admin Role exists
            let { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'Admin').single()

            if (!adminRole) {
                const { data: newRole, error: roleError } = await supabase.from('roles').insert([{
                    name: 'Admin',
                    description: 'Tam yetkili sistem yöneticisi',
                    permissions: ['view_dashboard', 'view_projects', 'create_project', 'edit_project', 'view_workshop', 'manage_workshop', 'update_status', 'view_tasks', 'view_team', 'manage_team', 'view_logs']
                }]).select().single()

                if (roleError) throw roleError
                adminRole = newRole
            }

            // 3. Create Profile
            const { error: profileError } = await supabase.from('profiles').upsert([{
                id: newUser.id,
                full_name: fullName,
                email: email,
                role_id: adminRole.id,
                can_login: true
            }])

            if (profileError) throw profileError

            setUser(newUser)
            setStatus('done')
        } catch (err) {
            setError(err.message)
            setStatus('error')
        }
    }

    return (
        <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#09090b' }}>
            <div className="card" style={{ width: '450px', padding: '3rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '1rem', marginBottom: '1.5rem', transition: 'all 0.5s ease' }}>
                        <Shield size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Kurulumu</h2>
                    <p style={{ color: 'var(--muted-foreground)' }}>Sistemi Supabase'e bağlamak için ilk admin hesabını oluşturun.</p>
                </div>

                {status === 'done' ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle2 size={48} color="#4ade80" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: '#4ade80', marginBottom: '1rem' }}>Başarılı!</h3>
                        <p style={{ marginBottom: '2rem' }}>Admin hesabınız oluşturuldu. Hemen giriş yapabilirsiniz.</p>
                        <button onClick={() => router.push('/login')} className="btn btn-primary" style={{ width: '100%' }}>Giriş Sayfasına Git</button>
                    </div>
                ) : (
                    <form onSubmit={handleBootstrap}>
                        {error && (
                            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Ad Soyad</label>
                            <div style={{ position: 'relative' }}>
                                <input required style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem' }} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Admin Ad Soyad" />
                                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '1rem', color: 'var(--muted-foreground)' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>E-posta</label>
                            <div style={{ position: 'relative' }}>
                                <input required type="email" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@repkon.com.tr" />
                                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '1rem', color: 'var(--muted-foreground)' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Şifre</label>
                            <div style={{ position: 'relative' }}>
                                <input required type="password" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem' }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '1rem', color: 'var(--muted-foreground)' }} />
                            </div>
                        </div>

                        <button disabled={status === 'loading'} className="btn btn-primary" style={{ width: '100%', height: '48px' }}>
                            {status === 'loading' ? 'Kuruluyor...' : 'Admin Hesabını Oluştur'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function BootstrapPage() {
    return (
        <Suspense fallback={<div style={{ background: '#09090b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>}>
            <BootstrapForm />
        </Suspense>
    )
}
