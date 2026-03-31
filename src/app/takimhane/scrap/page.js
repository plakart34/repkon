'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Trash2,
    Shield,
    Calendar,
    User,
    Package,
    Search,
    Info,
    ArrowLeftRight
} from 'lucide-react'

export default function ToolroomScrapPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_scrap') || profile?.roles?.name === 'Admin'

    const [loading, setLoading] = useState(true)
    const [scraps, setScraps] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_transactions')
            .select('*')
            .eq('transaction_type', 'Hurda')
            .order('transaction_date', { ascending: false })

        if (!error && data) {
            setScraps(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    const filtered = scraps.filter(s =>
        s.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.reciever_sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.scrap_description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Shield style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Hurda Takip modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in shadow-xl">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px' }}>
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Hurda Takip</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Takımhane üzerinden hurdaya ayrılan kalemlerin listesi.</p>
                        </div>
                    </div>
                </header>

                <div className="card" style={{
                    marginBottom: '2rem',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', opacity: 0.6 }} />
                        <input
                            type="text"
                            placeholder="Hurda kayıtlarında ara..."
                            className="input-field"
                            style={{ paddingLeft: '3.25rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>Tarih</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>Ürün Bilgisi</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>Personel</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>Hurda Açıklaması</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>Birim Adet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>Yükleniyor...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '5rem', textAlign: 'center' }}>
                                        <Info size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p style={{ color: 'var(--muted-foreground)' }}>Henüz herhangi bir hurda kaydı bulunmamaktadır.</p>
                                    </td>
                                </tr>
                            ) : filtered.map((s, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                                    <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {new Date(s.transaction_date).toLocaleDateString('tr-TR')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <Package size={18} style={{ opacity: 0.5 }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{s.item_description}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{s.item_no}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <User size={14} style={{ color: '#ef4444', opacity: 0.5 }} />
                                            {s.reciever_sender}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{
                                            padding: '0.75rem',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            border: '1px solid rgba(239, 68, 68, 0.1)',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            lineHeight: '1.4',
                                            color: 'rgba(255,255,255,0.8)'
                                        }}>
                                            {s.scrap_description}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ef4444' }}>
                                            1 <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>ADET</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
