'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts'
import {
    Activity,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Clock,
    BarChart3,
    PieChart as PieChartIcon,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react'

export default function Dashboard() {
    const { profile, loading: authLoading } = usePermissions()
    const [operations, setOperations] = useState([])
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: opData } = await supabase.from('operations').select('*')
            const { data: projData } = await supabase.from('projects').select('*')
            setOperations(opData || [])
            setProjects(projData || [])
        } catch (err) {
            console.error('Dashboard fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    // Data Transformation for Charts
    const statusData = useMemo(() => {
        const counts = operations.reduce((acc, op) => {
            acc[op.status] = (acc[op.status] || 0) + 1
            return acc
        }, {})
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [operations])

    const deptData = useMemo(() => {
        const counts = operations.reduce((acc, op) => {
            if (op.status === 'Tamamlandı') {
                acc[op.responsible_dept] = (acc[op.responsible_dept] || 0) + 1
            }
            return acc
        }, {})
        return Object.entries(counts)
            .map(([name, completed]) => ({ name, completed }))
            .sort((a, b) => b.completed - a.completed)
    }, [operations])

    const projectProgressData = useMemo(() => {
        return projects
            .slice(0, 8)
            .map(p => ({
                name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
                progress: p.progress || 0
            }))
            .sort((a, b) => b.progress - a.progress)
    }, [projects])

    const COLORS = ['#facc15', '#3b82f6', '#4ade80', '#ef4444', '#a855f7']

    if (authLoading || loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Analizler Hazırlanıyor...</div>
    if (!profile) return null

    const stats = {
        totalOps: operations.length,
        completedOps: operations.filter(o => o.status === 'Tamamlandı').length,
        delayedOps: operations.filter(o => {
            if (o.status === 'Tamamlandı' || !o.target_date) return false
            return new Date(o.target_date) < new Date()
        }).length,
        completionRate: operations.length ? Math.round((operations.filter(o => o.status === 'Tamamlandı').length / operations.length) * 100) : 0
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <BarChart3 size={32} color="var(--primary)" />
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Operasyonel Analiz Merkezi</h2>
                    </div>
                    <p style={{ color: 'var(--muted-foreground)' }}>Verimlilik raporları, departman performansları ve darboğaz analizi.</p>
                </header>

                {/* Quick Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    {[
                        { label: 'Toplam Aksiyon', value: stats.totalOps, icon: Activity, color: '#3b82f6' },
                        { label: 'Tamamlanan İşler', value: stats.completedOps, icon: CheckCircle2, color: '#4ade80' },
                        { label: 'Gecikmiş Aksiyonlar', value: stats.delayedOps, icon: AlertTriangle, color: '#ef4444' },
                        { label: 'Genel Başarı Oranı', value: `%${stats.completionRate}`, icon: TrendingUp, color: '#a855f7' }
                    ].map((s, i) => (
                        <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}>
                                <s.icon size={80} />
                            </div>
                            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{s.label}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Status Distribution */}
                    <div className="card" style={{ padding: '1.5rem', minHeight: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <PieChartIcon size={18} color="var(--primary)" />
                            <h4 style={{ fontWeight: 700 }}>Aksiyon Statü Dağılımı</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Department Performance */}
                    <div className="card" style={{ padding: '1.5rem', minHeight: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <TrendingUp size={18} color="var(--primary)" />
                            <h4 style={{ fontWeight: 700 }}>Departman Verimliliği (Tamamlanan İş)</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Project Progress Comparison */}
                    <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2', minHeight: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Activity size={18} color="var(--primary)" />
                            <h4 style={{ fontWeight: 700 }}>Proje İlerleme Durumları (%)</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={projectProgressData}>
                                <defs>
                                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="progress" stroke="var(--primary)" fillOpacity={1} fill="url(#colorProgress)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Anomaly / Overdue Section */}
                <section className="card" style={{ padding: '2rem', borderTop: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#ef4444' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Gecikme Analizi ve Kritik Darboğazlar</h4>
                            <p style={{ color: 'var(--muted-foreground)', margin: 0, fontSize: '0.9rem' }}>Hedef tarihi geçen ve hala işlem bekleyen kritik aksiyonlar.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {operations
                            .filter(o => o.status !== 'Tamamlandı' && o.target_date && new Date(o.target_date) < new Date())
                            .slice(0, 5)
                            .map(op => (
                                <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ minWidth: '100px', fontWeight: 800, color: '#ef4444' }}>{op.order_id}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{op.process}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{op.project_name} / {op.responsible_person}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>{Math.ceil((new Date() - new Date(op.target_date)) / (1000 * 60 * 60 * 24))} gün gecikti</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Hedef: {new Date(op.target_date).toLocaleDateString('tr-TR')}</div>
                                    </div>
                                </div>
                            ))
                        }
                        {operations.filter(o => o.status !== 'Tamamlandı' && o.target_date && new Date(o.target_date) < new Date()).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#4ade80', fontWeight: 600 }}>
                                Harika! Şu an için gecikmiş kritik bir aksiyon bulunmuyor.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
