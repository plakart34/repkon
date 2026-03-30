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
  AreaChart,
  Area
} from 'recharts'
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  FolderOpen,
  ArrowRight,
  Clock,
  Search,
  BellRing,
  Inbox
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UnifiedHome() {
  const { profile, loading: authLoading } = usePermissions()
  const [operations, setOperations] = useState([])
  const [projects, setProjects] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const router = useRouter()

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: opData } = await supabase.from('operations').select('*')
      const { data: projData } = await supabase.from('projects').select('*').order('name')

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setOperations(opData || [])
      setProjects(projData || [])
      setNotifications(notifData || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Unified Home fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notifId) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
    if (!error) fetchData()
  }

  useEffect(() => {
    if (profile) {
      fetchData()

      // Real-time Subscriptions
      const channel = supabase
        .channel('dashboard_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operations' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
        .on('postgres_changes', {
          event: '*', // Listen for ALL events (INSERT, UPDATE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, () => fetchData())
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile])

  // --- Data Transformations ---
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
      .slice(0, 5)
  }, [operations])

  const projectProgressData = useMemo(() => {
    return projects
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
        progress: p.progress || 0
      }))
  }, [projects])

  const COLORS = ['#facc15', '#3b82f6', '#4ade80', '#ef4444', '#a855f7']

  const stats = {
    totalOps: operations.length,
    completedOps: operations.filter(o => o.status === 'Tamamlandı').length,
    delayedOps: operations.filter(o => {
      if (o.status === 'Tamamlandı' || !o.target_date) return false
      const target = new Date(o.target_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      target.setHours(0, 0, 0, 0)
      return target < today
    }).length,
    completionRate: operations.length ? Math.round((operations.filter(o => o.status === 'Tamamlandı').length / operations.length) * 100) : 0
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.responsible_engineer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (authLoading || loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Sistem Özet Verileri Yükleniyor...</div>
  if (!profile) return null

  return (
    <div className="main-container">
      <Sidebar profile={profile} />

      <main className="content animate-fade-in" style={{ paddingBottom: '5rem' }}>
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={32} color="var(--primary)" />
              <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>RMK Tracker / Komuta Merkezi</h2>
            </div>
            <p style={{ color: 'var(--muted-foreground)' }}>Projelerin genel durumu, operasyonel analizler ve kritik işlerin özeti.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(74, 222, 128, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '50px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
              <div style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', animation: 'pulse-ping 2s infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.5px' }}>CANLI VERİ AKIŞI AKTİF</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Son Güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}</div>
          </div>
        </header>

        {/* --- Row 1: Quick Stats --- */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Vadesi Geçmiş', value: stats.delayedOps, icon: AlertTriangle, color: '#ef4444', sub: 'Kritik müdahale bekleyen' },
            { label: 'Tamamlanan', value: stats.completedOps, icon: CheckCircle2, color: '#4ade80', sub: 'Başarıyla sonuçlanan' },
            { label: 'Aktif Aksiyonlar', value: stats.totalOps - stats.completedOps, icon: Activity, color: '#3b82f6', sub: 'Süreçteki toplam iş' },
            { label: 'Genel Performans', value: `%${stats.completionRate}`, icon: TrendingUp, color: '#a855f7', sub: 'İş bitirme oranı' }
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${s.color}`, background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                <s.icon size={18} color={s.color} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* --- Row 2: Charts & Analysis --- */}
        <div className="responsive-grid" style={{ marginBottom: '2rem' }}>

          {/* Project Progress Graph */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="var(--primary)" />
                <h4 style={{ fontWeight: 700 }}>Proje İlerleme Durumları (%)</h4>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={projectProgressData}>
                <defs>
                  <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="progress" stroke="var(--primary)" fillOpacity={1} fill="url(#colorProg)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Pie Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PieChartIcon size={18} color="var(--primary)" />
              <h4 style={{ fontWeight: 700 }}>Aksiyon Statü Dağılımı</h4>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                  {statusData.map((e, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Row 3: Project List & Overdue Alerts --- */}
        <div className="responsive-grid">

          {/* Project List */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FolderOpen size={20} color="var(--primary)" />
                <h3 style={{ fontWeight: 700 }}>Aktif Projeler</h3>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input
                  placeholder="Proje ara..."
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.8rem', width: '200px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div style={{ padding: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem' }}>Proje Adı</th>
                    <th style={{ padding: '1rem' }}>Sorumlu</th>
                    <th style={{ padding: '1rem' }}>İlerleme</th>
                    <th style={{ padding: '1rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.slice(0, 6).map(p => (
                    <tr key={p.id} className="nav-item-mini" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => router.push(`/projects/${p.id}`)}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{p.responsible_engineer || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.progress}%`, height: '100%', background: p.progress === 100 ? '#4ade80' : 'var(--primary)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '30px' }}>%{p.progress || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <ArrowRight size={16} color="var(--muted-foreground)" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => router.push('/projects')}
                style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', borderTop: '1px solid var(--border)' }}
              >
                Tüm Projeleri Görüntüle
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Notification Center */}
            <div className="card" style={{ padding: '0', border: '1px solid rgba(59, 130, 246, 0.2)', background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.05), transparent)' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BellRing size={20} color="#3b82f6" />
                  <h3 style={{ fontWeight: 700 }}>Son Bildirimler</h3>
                </div>
                {notifications.filter(n => !n.is_read).length > 0 &&
                  <div style={{ fontSize: '10px', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                    {notifications.filter(n => !n.is_read).length}
                  </div>
                }
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { markAsRead(n.id); if (n.action_link) router.push(n.action_link); }}
                    style={{
                      padding: '1rem',
                      background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(59, 130, 246, 0.05)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: n.is_read ? '3px solid transparent' : '3px solid #3b82f6',
                      opacity: n.is_read ? 0.6 : 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: n.is_read ? 600 : 800 }}>{n.title}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: n.is_read ? 'var(--muted-foreground)' : 'var(--foreground)', lineHeight: '1.4' }}>{n.message}</div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <Inbox size={32} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
                    Şu an bildiriminiz bulunmuyor.
                  </div>
                )}
              </div>
            </div>

            {/* Bottlenecks / Overdue Alerts */}
            <div className="card" style={{ padding: '0', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={20} color="#ef4444" />
                <h3 style={{ fontWeight: 700, color: '#ef4444' }}>Kritik Gecikmeler</h3>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {operations
                  .filter(o => o.status !== 'Tamamlandı' && o.target_date && new Date(o.target_date) < new Date())
                  .slice(0, 5)
                  .map(op => (
                    <div
                      key={op.id}
                      onClick={() => router.push('/workshop')}
                      style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>{op.order_id}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={10} /> {new Date(op.target_date).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{op.process}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{op.project_name} / {op.responsible_person}</div>
                    </div>
                  ))
                }
                {operations.filter(o => (o.status !== 'Tamamlandı' && o.target_date && new Date(o.target_date) < new Date())).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={32} color="#4ade80" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                    Her şey yolunda. Gecikmiş iş bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
