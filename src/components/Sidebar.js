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
import { storage } from '@/lib/storage'

export default function Sidebar({ profile }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(pathname.startsWith('/projects'))
    const [isTeamExpanded, setIsTeamExpanded] = useState(pathname.startsWith('/team'))
    const [projects, setProjects] = useState([])
    const [departments, setDepartments] = useState([])
    const [theme, setTheme] = useState('dark')

    useEffect(() => {
        setProjects(storage.getProjects())
        setDepartments(storage.getDepartments())
        const savedTheme = localStorage.getItem('rmk_theme') || 'dark'
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
    }, [pathname])

    const toggleTheme = (newTheme) => {
        setTheme(newTheme)
        localStorage.setItem('rmk_theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const handleLogout = async () => {
        storage.logout()
        window.location.href = '/login'
    }

    const permissions = profile?.roles?.permissions || []
    const isAdmin = profile?.roles?.name === 'Admin'

    const permissionMap = {
        '/': 'view_dashboard',
        '/projects': 'view_projects',
        '/workshop': 'view_workshop',
        '/tasks': 'view_tasks',
        '/logs': 'view_logs',
        '/team': 'view_team'
    }

    const canSee = (path) => isAdmin || permissions.includes(permissionMap[path])

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
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
        <aside className="sidebar">
            <h1 onClick={() => router.push('/')} style={{ cursor: 'pointer', marginBottom: '2.5rem' }}>RMK Tracker</h1>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(item => {
                    if (item.adminOnly && !isAdmin) return null
                    if (!item.adminOnly && item.path !== '/' && !canSee(item.path)) return null

                    const Icon = item.icon
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

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
                                            {item.submenuType === 'team' ? 'Departmanlar' : 'Tüm Projeler'}
                                        </a>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.25rem' }}>
                    <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>
                        {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }} className="sidebar-only">
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{profile?.full_name || 'Kullanıcı'}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', margin: 0, whiteSpace: 'nowrap' }}>{profile?.roles?.name || 'Üye'}</p>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }} title="Çıkış Yap">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
