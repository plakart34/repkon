'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Calendar as CalendarIcon,
    Users,
    CheckCircle2,
    Clock,
    Play,
    Timer,
    Activity,
    AlertCircle,
    UserCircle,
    Building,
    Folder,
    LayoutGrid,
    CalendarDays
} from 'lucide-react'

export default function Tasks() {
    const { profile, loading: authLoading } = usePermissions()
    const [operations, setOperations] = useState([])
    const [departments, setDepartments] = useState([])
    const [activeDept, setActiveDept] = useState('')
    const [viewType, setViewType] = useState('kanban') // 'kanban' veya 'calendar'

    useEffect(() => {
        const fetchTasks = async () => {
            if (profile) {
                const { data, error } = await supabase.from('operations')
                    .select('*')

                if (error) {
                    console.error('Task fetch error:', error)
                    return
                }

                const filtered = (data || []).filter(op => op.status !== 'Tamamlandı' && op.status !== 'Durduruldu')
                setOperations(filtered)

                const depts = [...new Set(filtered.map(op => op.responsible_dept).filter(Boolean))]
                setDepartments(depts)
                if (depts.length > 0 && !activeDept) {
                    setActiveDept(depts[0])
                }
            }
        }
        fetchTasks()
    }, [profile])

    const groupedData = useMemo(() => {
        if (!activeDept) return {}

        const deptOps = operations.filter(op => op.responsible_dept === activeDept)
        const grouped = deptOps.reduce((acc, op) => {
            const person = op.responsible_person || 'Atanmamış'
            if (!acc[person]) acc[person] = []
            acc[person].push(op)
            return acc
        }, {})

        Object.keys(grouped).forEach(person => {
            grouped[person].sort((a, b) => {
                if (!a.target_date) return 1
                if (!b.target_date) return -1
                return new Date(a.target_date) - new Date(b.target_date)
            })
        })

        return grouped
    }, [operations, activeDept])

    // Takvim verileri
    const calendarDates = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return Array.from({ length: 15 }).map((_, i) => {
            const d = new Date(today)
            d.setDate(d.getDate() + i)
            return d
        })
    }, [])

    const getTargetDateStyle = (date) => {
        if (!date) return { color: 'var(--muted-foreground)', text: 'Tarih Yok', icon: <Clock size={12} /> }
        const target = new Date(date)
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        target.setHours(0, 0, 0, 0)

        const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return { color: '#ef4444', text: `Gecikti (${Math.abs(diffDays)} G)`, icon: <AlertCircle size={12} /> }
        if (diffDays === 0) return { color: '#facc15', text: 'Bugün', icon: <Timer size={12} /> }
        if (diffDays <= 3) return { color: '#facc15', text: `${diffDays} gün kaldı`, icon: <Timer size={12} /> }
        return { color: '#4ade80', text: `${diffDays} gün kaldı`, icon: <CalendarIcon size={12} /> }
    }

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    // Takvim hücresi render fonksiyonu
    const renderCalendarCell = (ops, cellDate, isOverdue = false, isNoDate = false) => {
        const cellOps = ops.filter(op => {
            if (isNoDate) return !op.target_date
            if (!op.target_date) return false

            const target = new Date(op.target_date)
            target.setHours(0, 0, 0, 0)

            if (isOverdue) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return target < today
            }

            return target.getTime() === cellDate.getTime()
        })

        return (
            <div style={{ padding: '0.5rem', minHeight: '120px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                {cellOps.map(op => {
                    const ds = getTargetDateStyle(op.target_date)
                    return (
                        <div key={op.id} style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${op.status === 'İşlemde' ? '#3b82f6' : '#facc15'}`, borderRadius: '6px', fontSize: '0.75rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>{op.order_id}</div>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>{op.process}</div>
                            <div style={{ color: ds.color, display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>{ds.icon} {op.status}</div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in" style={{ minWidth: 0 }}>
                <header className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Building size={32} color="var(--primary)" /> Ekip İş Takibi <span style={{ fontSize: '1rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>(Aktif Görevler)</span>
                        </h2>
                        <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>Ekiplerin ve personelin sorumluluğundaki güncel çalıştay aksiyonları.</p>
                    </div>

                    <div style={{ display: 'flex', background: 'var(--secondary)', padding: '0.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setViewType('kanban')}
                            style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: 'none', background: viewType === 'kanban' ? 'var(--primary)' : 'transparent', color: viewType === 'kanban' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <LayoutGrid size={16} /> Kanban
                        </button>
                        <button
                            onClick={() => setViewType('calendar')}
                            style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: 'none', background: viewType === 'calendar' ? 'var(--primary)' : 'transparent', color: viewType === 'calendar' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <CalendarDays size={16} /> Personel Takvimi
                        </button>
                    </div>
                </header>

                {/* Department Tabs */}
                {departments.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {departments.map(dept => (
                            <button
                                key={dept}
                                onClick={() => setActiveDept(dept)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '50px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    background: activeDept === dept ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeDept === dept ? 'white' : 'var(--muted-foreground)',
                                    border: `1px solid ${activeDept === dept ? 'var(--primary)' : 'transparent'}`,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        Şu anda hiçbir ekipte aktif/bekleyen bir görev bulunmamaktadır.
                    </div>
                )}

                {activeDept && viewType === 'kanban' && (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '2rem' }}>
                        {Object.entries(groupedData).map(([person, ops]) => (
                            <div key={person} style={{ minWidth: '350px', maxWidth: '350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'var(--primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{person.charAt(0)}</div>
                                        <div>
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{person}</h3>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{ops.length} aktif görev</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {ops.map(op => {
                                        const dateStyle = getTargetDateStyle(op.target_date)
                                        return (
                                            <div key={op.id} className="card" style={{ padding: '1rem', background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `4px solid ${op.status === 'İşlemde' ? '#3b82f6' : '#facc15'}`, position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>{op.order_id}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: dateStyle.color, fontWeight: 700, background: `${dateStyle.color}15`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                        {dateStyle.icon} {dateStyle.text}
                                                    </div>
                                                </div>
                                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{op.process}</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Folder size={12} /> <span style={{ color: 'white' }}>{op.project_name}</span></div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={12} /> <span>{op.machine_name}</span></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeDept && viewType === 'calendar' && (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '1rem', width: '200px', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 10, borderRight: '1px solid var(--border)' }}>Personel</th>
                                    <th style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid var(--border)' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem' }}>Gecikmiş İşler</div>
                                    </th>
                                    <th style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.85rem' }}>Tarihsiz</div>
                                    </th>
                                    {calendarDates.map((date, idx) => (
                                        <th key={idx} style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: idx === 0 ? '#3b82f6' : 'white' }}>{date.getDate()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{date.toLocaleDateString('tr-TR', { month: 'short' })}</span></div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groupedData).map(([person, ops]) => (
                                    <tr key={person} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 10, borderRight: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{person}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{ops.length} Görev</div>
                                        </td>
                                        <td style={{ verticalAlign: 'top', padding: 0 }}>
                                            {renderCalendarCell(ops, null, true, false)}
                                        </td>
                                        <td style={{ verticalAlign: 'top', padding: 0 }}>
                                            {renderCalendarCell(ops, null, false, true)}
                                        </td>
                                        {calendarDates.map((date, idx) => (
                                            <td key={idx} style={{ verticalAlign: 'top', padding: 0 }}>
                                                {renderCalendarCell(ops, date)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}
