'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    History,
    Activity,
    Clock,
    User,
    MessageSquare,
    Play,
    Timer,
    CheckCircle2,
    Calendar,
    Folder,
    Eye,
    EyeOff
} from 'lucide-react'

export default function LogsPage() {
    const { profile, loading: authLoading } = usePermissions()
    const [logs, setLogs] = useState([])
    const isAdmin = profile?.roles?.name === 'Admin' || profile?.role_id === 1 || profile?.role_id === "1"

    const fetchLogs = async () => {
        if (!profile) return
        const { data: allOps, error } = await supabase.from('operations').select('*')
        if (error) {
            console.error('Logs fetch error:', error)
            return
        }

        const extractedLogs = []
        allOps.forEach(op => {
            if (op.history && Array.isArray(op.history)) {
                op.history.forEach((h, index) => {
                    // Non-admin users cannot see hidden logs
                    if (h.hidden && !isAdmin) return

                    extractedLogs.push({
                        id: `${op.id}-${index}`,
                        opId: op.id,
                        orderId: op.order_id,
                        process: op.process,
                        projectName: op.project_name,
                        machineName: op.machine_name,
                        status: h.status,
                        note: h.note,
                        timestamp: new Date(h.timestamp),
                        user: h.user || 'Bilinmiyor',
                        department: op.responsible_dept || 'Bilinmiyor',
                        hidden: h.hidden || false,
                        historyIndex: index
                    })
                })
            }
        })

        extractedLogs.sort((a, b) => b.timestamp - a.timestamp)
        setLogs(extractedLogs)
    }

    useEffect(() => {
        fetchLogs()
    }, [profile])


    const getStatusIcon = (status) => {
        switch (status) {
            case 'Bekliyor': return <Timer size={16} color="#facc15" />
            case 'İşlemde': return <Play size={16} color="#3b82f6" />
            case 'Tamamlandı': return <CheckCircle2 size={16} color="#4ade80" />
            default: return <Activity size={16} />
        }
    }

    const toggleVisibility = async (log) => {
        if (!isAdmin) return

        try {
            const { data: op } = await supabase
                .from('operations')
                .select('history')
                .eq('id', log.opId)
                .single()

            if (op && op.history) {
                const newHistory = [...op.history]
                newHistory[log.historyIndex].hidden = !log.hidden

                const { error } = await supabase
                    .from('operations')
                    .update({ history: newHistory })
                    .eq('id', log.opId)

                if (!error) fetchLogs()
            }
        } catch (e) {
            console.error('Visibility update error:', e)
        }
    }

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const groupedLogs = logs.reduce((acc, log) => {
        const dateStr = log.timestamp.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        if (!acc[dateStr]) acc[dateStr] = []
        acc[dateStr].push(log)
        return acc
    }, {})

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in" style={{ minWidth: 0 }}>
                <header className="header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <History size={32} color="var(--primary)" /> Sistem Logları (Değişiklik Kayıtları)
                        </h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Sistem üzerinde gerçekleştirilen yeni aksiyon tanımlamaları ve statü güncellemelerinin zaman tüneli.</p>
                    </div>
                </header>

                <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
                    {Object.keys(groupedLogs).length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                            Sistemde atanmış bir aktivite kaydı bulunmamaktadır.
                        </div>
                    ) : (
                        Object.entries(groupedLogs).map(([dateStr, items]) => (
                            <div key={dateStr} style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted-foreground)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {dateStr}
                                    </h3>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {items.map(log => (
                                        <div key={log.id} className="card" style={{
                                            padding: '1.25rem',
                                            position: 'relative',
                                            opacity: log.hidden ? 0.6 : 1,
                                            borderLeft: `3px solid ${log.status === 'İşlemde' ? '#3b82f6' : log.status === 'Tamamlandı' ? '#4ade80' : '#facc15'}`,
                                            background: log.hidden ? 'rgba(255,100,100,0.02)' : 'var(--card)'
                                        }}>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                        <Clock size={12} color="var(--muted-foreground)" />
                                                        {log.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <User size={14} /> {log.user} <span style={{ opacity: 0.5 }}>({log.department})</span>
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {(isAdmin || profile?.roles?.permissions?.includes('hide_logs')) && (
                                                        <button
                                                            onClick={() => toggleVisibility(log)}
                                                            title={log.hidden ? "Görünür Yap" : "Gizle (Sadece Admin Görebilir)"}
                                                            style={{ background: 'none', border: 'none', color: log.hidden ? '#ef4444' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}
                                                        >
                                                            {log.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            {log.hidden ? 'Gizli' : 'Görünür'}
                                                        </button>
                                                    )}
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        {getStatusIcon(log.status)} {log.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ paddingLeft: '0.5rem' }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginRight: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{log.orderId}</span>
                                                    {log.process}
                                                </h4>

                                                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Folder size={12} /> {log.projectName}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={12} /> {log.machineName}</span>
                                                </div>

                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--foreground)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <MessageSquare size={14} style={{ color: 'var(--muted-foreground)', marginTop: '2px' }} />
                                                    <span>{log.note || 'Sistem tarafından belirtilmiş otomatik işlem notu.'}</span>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}
