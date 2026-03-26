'use client'

import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Briefcase,
    CheckSquare,
    Users,
    UserPlus,
    LogOut,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    Hammer,
    Sun,
    Moon,
    Monitor,
    History
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Chat from './Chat'
import { createPortal } from 'react-dom'
import { KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Sidebar({ profile }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(pathname.startsWith('/projects'))
    const [isTeamExpanded, setIsTeamExpanded] = useState(pathname.startsWith('/team') || pathname === '/register-staff')
    const [projects, setProjects] = useState([])
    const [departments, setDepartments] = useState([])
    const [theme, setTheme] = useState('dark')
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [status, setStatus] = useState(null) // 'success' | 'error'

    const fetchData = async () => {
        const { data: projData } = await supabase.from('projects').select('*').order('name')
        const { data: deptData } = await supabase.from('depts').select('name').order('name')
        setProjects(projData || [])
        setDepartments(deptData?.map(d => d.name) || [])
    }

    useEffect(() => {
        if (profile) {
            fetchData()
        }
        const savedTheme = localStorage.getItem('rmk_theme') || 'dark'
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
    }, [pathname, profile])

    const toggleTheme = (newTheme) => {
        setTheme(newTheme)
        localStorage.setItem('rmk_theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'Şifreler eşleşmiyor!' })
            return
        }
        if (newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Şifre en az 6 karakter olmalıdır!' })
            return
        }

        setIsUpdating(true)
        setStatus(null)

        try {
            // 1. Auth Şifresini Güncelle
            const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
            if (authError) throw authError

            // 2. Profiles tablosundaki temporary_password alanını güncelle
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ temporary_password: newPassword })
                .eq('id', profile.id)

            if (profileError) throw profileError

            setStatus({ type: 'success', message: 'Şifreniz başarıyla güncellendi.' })
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => {
                setIsPasswordModalOpen(false)
                setStatus(null)
            }, 2000)
        } catch (err) {
            setStatus({ type: 'error', message: err.message })
        } finally {
            setIsUpdating(false)
        }
    }

    const permissions = profile?.roles?.permissions || []
    const isAdmin = profile?.roles?.name === 'Admin'

    const permissionMap = {
        '/': 'view_dashboard',
        '/dashboard': 'view_dashboard',
        '/projects': 'view_projects',
        '/workshop': 'view_workshop',
        '/tasks': 'view_tasks',
        '/logs': 'view_logs',
        '/team': 'view_team'
    }

    const canSee = (path) => isAdmin || permissions.includes(permissionMap[path])

    const navItems = [
        { name: 'Giriş / Projeler', path: '/', icon: Briefcase },
        { name: 'Analizler (Dashboard)', path: '/dashboard', icon: LayoutDashboard },
        {
            name: 'Projeler',
            path: '/projects',
            icon: Briefcase,
            hasSubmenu: true
        },
        { name: 'Çalıştay', path: '/workshop', icon: Hammer },
        { name: 'İş Takibi', path: '/tasks', icon: CheckSquare },
        { name: 'Log Kayıtları', path: '/logs', icon: History },
        {
            name: 'Ekip Yönetimi',
            path: '/team',
            icon: Users,
            hasSubmenu: true,
            submenuType: 'team'
        }
    ]

    return (
        <>
            <aside className="sidebar">
                <h1 onClick={() => router.push('/')} style={{ cursor: 'pointer', marginBottom: '2.5rem' }}>RMK Tracker</h1>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {navItems.map(item => {
                        if (item.adminOnly && !isAdmin) return null
                        if (!item.adminOnly && item.path !== '/' && !canSee(item.path)) return null

                        const Icon = item.icon
                        const isActive = pathname === item.path ||
                            (item.path !== '/' && pathname.startsWith(item.path)) ||
                            (item.submenuType === 'team' && pathname === '/register-staff')

                        if (item.hasSubmenu) {
                            const isExpanded = item.submenuType === 'team' ? isTeamExpanded : isProjectsExpanded
                            const toggleExpand = () => item.submenuType === 'team' ? setIsTeamExpanded(!isTeamExpanded) : setIsProjectsExpanded(!isProjectsExpanded)
                            const subItems = item.submenuType === 'team' ? departments : projects

                            return (
                                <div key={item.path} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                        onClick={toggleExpand}
                                        style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Icon size={20} /> <span>{item.name}</span>
                                        </div>
                                        <div className="sidebar-only">
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="sidebar-only animate-fade-in" style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.25rem' }}>
                                            <a
                                                href={item.path}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.5rem 0.75rem',
                                                    color: pathname === item.path ? 'var(--primary)' : 'var(--muted-foreground)',
                                                    fontWeight: pathname === item.path ? 600 : 400,
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                {item.submenuType === 'team' ? 'Departman / Tüm Ekip' : 'Tüm Projeler'}
                                            </a>

                                            {item.submenuType === 'team' && isAdmin && (
                                                <a
                                                    href="/register-staff"
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        padding: '0.5rem 0.75rem',
                                                        color: pathname === '/register-staff' ? 'white' : 'var(--muted-foreground)',
                                                        fontWeight: pathname === '/register-staff' ? 600 : 400,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        textDecoration: 'none',
                                                        background: pathname === '/register-staff' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                        borderRadius: 'var(--radius)'
                                                    }}
                                                >
                                                    <UserPlus size={14} style={{ color: '#4ade80' }} /> <span>Personel Ekle / Yön.</span>
                                                </a>
                                            )}

                                            {item.submenuType === 'team' ? (
                                                departments.map(dept => (
                                                    <div
                                                        key={dept}
                                                        onClick={() => router.push(`/team?dept=${encodeURIComponent(dept)}`)}
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            padding: '0.5rem 0.75rem',
                                                            color: 'var(--muted-foreground)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            textDecoration: 'none'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.color = 'white'}
                                                        onMouseLeave={(e) => e.target.style.color = 'var(--muted-foreground)'}
                                                    >
                                                        <FolderOpen size={14} style={{ color: '#3b82f6' }} /> <span>{dept}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                projects.map(proj => (
                                                    <a
                                                        key={proj.id}
                                                        href={`/projects/${proj.id}`}
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            padding: '0.5rem 0.75rem',
                                                            color: pathname === `/projects/${proj.id}` ? 'white' : 'var(--muted-foreground)',
                                                            fontWeight: pathname === `/projects/${proj.id}` ? 600 : 400,
                                                            textDecoration: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            background: pathname === `/projects/${proj.id}` ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                            borderRadius: 'var(--radius)'
                                                        }}
                                                    >
                                                        <FolderOpen size={14} style={{ color: '#facc15' }} /> <span>{proj.name}</span>
                                                    </a>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <a
                                key={item.path}
                                href={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                title={item.name}
                            >
                                <Icon size={20} /> <span>{item.name}</span>
                            </a>
                        )
                    })}
                </nav>
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div className="sidebar-only" style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--secondary)', padding: '0.3rem', borderRadius: 'var(--radius)' }}>
                            <button
                                onClick={() => toggleTheme('dark')}
                                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: theme === 'dark' ? 'var(--primary)' : 'transparent', border: 'none', color: theme === 'dark' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Koyu Tema"
                            >
                                <Moon size={14} />
                            </button>
                            <button
                                onClick={() => toggleTheme('light')}
                                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: theme === 'light' ? 'var(--primary)' : 'transparent', border: 'none', color: theme === 'light' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Açık Tema"
                            >
                                <Sun size={14} />
                            </button>
                            <button
                                onClick={() => toggleTheme('rmk')}
                                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: theme === 'rmk' ? 'var(--primary)' : 'transparent', border: 'none', color: theme === 'rmk' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="RMK Kurumsal"
                            >
                                <Monitor size={14} />
                            </button>
                        </div>
                    </div>

                    <div
                        onClick={() => setIsPasswordModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.25rem', cursor: 'pointer', borderRadius: 'var(--radius)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }} className="sidebar-only">
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{profile?.full_name || 'Kullanıcı'}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', margin: 0, whiteSpace: 'nowrap' }}>{profile?.roles?.name || 'Üye'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }} title="Çıkış Yap">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>
            {canSee('/chat') || profile?.roles?.permissions?.includes('view_chat') ? <Chat profile={profile} /> : null}

            {isPasswordModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '400px', padding: '2.5rem', background: 'var(--card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '8px', color: '#3b82f6' }}>
                                    <KeyRound size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Şifre Değiştir</h3>
                            </div>
                            <button onClick={() => { setIsPasswordModalOpen(false); setStatus(null); }} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Yeni Şifre</label>
                                <input
                                    type="password"
                                    required
                                    style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', color: 'white' }}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Yeni Şifre (Tekrar)</label>
                                <input
                                    type="password"
                                    required
                                    style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', color: 'white' }}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>

                            {status && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.85rem',
                                    background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: status.type === 'success' ? '#4ade80' : '#ef4444'
                                }}>
                                    {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {status.message}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="btn" style={{ background: 'var(--secondary)' }}>İptal</button>
                                <button type="submit" disabled={isUpdating} className="btn btn-primary">
                                    {isUpdating ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
