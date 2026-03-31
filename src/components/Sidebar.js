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
    History,
    Bell,
    Check,
    Archive
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
    const [isToolroomExpanded, setIsToolroomExpanded] = useState(pathname.startsWith('/takimhane'))
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

    const [notifications, setNotifications] = useState([])
    const [unreadNotifCount, setUnreadNotifCount] = useState(0)
    const [isNotifOpen, setIsNotifOpen] = useState(false)

    const fetchNotifications = async () => {
        if (!profile) return
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10)
        setNotifications(data || [])

        // Count ALL unread notifications
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_read', false)

        setUnreadNotifCount(count || 0)
    }

    const markAsRead = async (notifId) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
        fetchNotifications()
    }

    const markAllAsRead = async () => {
        if (!profile) return
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
        fetchNotifications()
    }

    useEffect(() => {
        const savedTheme = localStorage.getItem('rmk_theme') || 'dark'
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
    }, [])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useEffect(() => {
        if (profile) {
            fetchData()
            fetchNotifications()

            // Realtime Notifications
            const channel = supabase
                .channel(`notif_realtime_${profile.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                }, () => {
                    fetchNotifications()
                })
                .subscribe()

            return () => supabase.removeChannel(channel)
        }
    }, [profile])

    const toggleTheme = (newTheme) => {
        setTheme(newTheme)
        localStorage.setItem('rmk_theme', newTheme)
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

            // 2. Profiles tablosundaki password alanını güncelle
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ password: newPassword })
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
        '/team': 'view_team',
        '/takimhane': 'view_toolroom',
        '/takimhane/in-out': 'view_toolroom_in_out',
        '/takimhane/datesheet': 'view_toolroom_datesheet',
        '/takimhane/stock': 'view_toolroom_stock',
        '/takimhane/field': 'view_toolroom_field',
        '/takimhane/definitions': 'view_toolroom_definitions',
        '/takimhane/calibration': 'view_toolroom_calibration',
        '/takimhane/scrap': 'view_toolroom_scrap'
    }

    const canSee = (path) => isAdmin || permissions.includes(permissionMap[path])

    const navItems = [
        { name: 'Genel Bakış', path: '/', icon: LayoutDashboard },
        {
            name: 'Projeler',
            path: '/projects',
            icon: Briefcase,
            hasSubmenu: true
        },
        { name: 'Çalıştay', path: '/workshop', icon: Hammer },
        { name: 'İş Takibi', path: '/tasks', icon: CheckSquare },
        {
            name: 'Takımhane',
            path: '/takimhane',
            icon: Archive,
            hasSubmenu: true,
            submenuType: 'toolroom'
        },
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h1 onClick={() => router.push('/')} style={{ cursor: 'pointer', margin: 0 }}>RMK Tracker</h1>

                    {/* Notification Bell */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsNotifOpen(!isNotifOpen); }}
                            style={{
                                background: 'none', border: 'none', color: unreadNotifCount > 0 ? 'var(--primary)' : 'var(--muted-foreground)',
                                cursor: 'pointer', padding: '0.4rem', borderRadius: '8px',
                                transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Bell size={20} fill={unreadNotifCount > 0 ? 'var(--primary)' : 'none'} />
                            {unreadNotifCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '0', right: '0',
                                    minWidth: '16px', height: '16px', background: '#ef4444',
                                    borderRadius: '50%', border: '2px solid #09090b',
                                    fontSize: '9px', fontWeight: 900, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{unreadNotifCount}</span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <div
                                className="card animate-scale-in"
                                style={{
                                    position: 'fixed',
                                    top: '4rem',
                                    left: '1.5rem',
                                    zIndex: 5000,
                                    width: '320px',
                                    background: 'var(--card)',
                                    border: '1px solid var(--border)',
                                    padding: '1.25rem',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(20px)',
                                    maxHeight: '80vh',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Bildirimler</h4>
                                    <button
                                        onClick={markAllAsRead}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Tümünü Oku
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>Bildirim yok.</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => { markAsRead(n.id); if (n.action_link) router.push(n.action_link); setIsNotifOpen(false); }}
                                                style={{
                                                    padding: '0.75rem', borderRadius: '10px', background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                                                    cursor: 'pointer', border: '1px solid', borderColor: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                                                    transition: '0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--primary)' }} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white text-primary' }}>{n.title}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>{n.message}</p>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.4rem' }}>{new Date(n.created_at).toLocaleString('tr-TR')}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {navItems.map(item => {
                        if (item.adminOnly && !isAdmin) return null
                        if (!item.adminOnly && item.path !== '/' && !canSee(item.path)) return null

                        const Icon = item.icon
                        const isActive = pathname === item.path ||
                            (item.path !== '/' && pathname.startsWith(item.path)) ||
                            (item.submenuType === 'team' && pathname === '/register-staff')

                        if (item.hasSubmenu) {
                            let isExpanded = false
                            let toggleExpand = () => { }
                            let subItems = []

                            if (item.submenuType === 'team') {
                                isExpanded = isTeamExpanded
                                toggleExpand = () => setIsTeamExpanded(!isTeamExpanded)
                                subItems = departments
                            } else if (item.submenuType === 'toolroom') {
                                isExpanded = isToolroomExpanded
                                toggleExpand = () => setIsToolroomExpanded(!isToolroomExpanded)
                                subItems = [
                                    { name: 'Giriş-Çıkış', path: '/takimhane/in-out' },
                                    { name: 'Stok Durumu', path: '/takimhane/stock' },
                                    { name: 'Datesheet', path: '/takimhane/datesheet' },
                                    { name: 'Kalibrasyon Takip', path: '/takimhane/calibration' },
                                    { name: 'Hurda Takip', path: '/takimhane/scrap' },
                                    { name: 'Saha Envanteri', path: '/takimhane/field' },
                                    { name: 'Tanımlamalar', path: '/takimhane/definitions' }
                                ]
                            } else {
                                isExpanded = isProjectsExpanded
                                toggleExpand = () => setIsProjectsExpanded(!isProjectsExpanded)
                                subItems = projects
                            }

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
                                                {item.submenuType === 'team' ? 'Departman / Tüm Ekip' : item.submenuType === 'toolroom' ? 'Takımhane Paneli' : 'Tüm Projeler'}
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
                                            ) : item.submenuType === 'toolroom' ? (
                                                subItems.filter(sub => canSee(sub.path)).map(sub => (
                                                    <a
                                                        key={sub.path}
                                                        href={sub.path}
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            padding: '0.5rem 0.75rem',
                                                            color: pathname === sub.path ? 'white' : 'var(--muted-foreground)',
                                                            fontWeight: pathname === sub.path ? 600 : 400,
                                                            textDecoration: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            background: pathname === sub.path ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                            borderRadius: 'var(--radius)'
                                                        }}
                                                    >
                                                        <ChevronRight size={14} style={{ opacity: 0.5 }} /> <span>{sub.name}</span>
                                                    </a>
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
                <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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
