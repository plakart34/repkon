'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Search,
    Package,
    AlertTriangle,
    History,
    ChevronDown,
    ChevronUp,
    BarChart3,
    ArrowRight,
    Shield
} from 'lucide-react'

export default function ToolroomStockPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_stock') || profile?.roles?.name === 'Admin'

    const [items, setItems] = useState([])
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedItem, setExpandedItem] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        const { data: itemData } = await supabase
            .from('toolroom_items')
            .select('*')
            .order('item_description', { ascending: true })

        if (itemData) setItems(itemData)

        const { data: transData } = await supabase
            .from('toolroom_transactions')
            .select('*')
            .order('sequence_no', { ascending: false })

        if (transData) setTransactions(transData)

        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

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
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane stok modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{ padding: '2rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Stok Verileri Yükleniyor...</div>
                    </div>
                </main>
            </div>
        )
    }

    const filteredItems = items.filter(item =>
        item.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        totalItems: items.length,
        lowStock: items.filter(i => i.quantity <= 0).length,
        totalStock: items.reduce((acc, current) => acc + (current.quantity || 0), 0)
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />
            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
                            padding: '1rem',
                            borderRadius: '16px',
                            boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BarChart3 size={32} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.875rem' }}>Güncel Stok Durumu</h2>
                            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                                Takımhane envanterindeki tüm ürünlerin anlık stok miktarları ve hareket geçmişi.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Statistics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                            <Package size={24} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Ürün</span>
                            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', fontWeight: 800 }}>{stats.totalItems}</h2>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kritik Seviye / Yok</span>
                            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', fontWeight: 800 }}>{stats.lowStock}</h2>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid #4ade80' }}>
                        <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                            <History size={24} style={{ color: '#4ade80' }} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Envanter Adedi</span>
                            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', fontWeight: 800 }}>{stats.totalStock}</h2>
                        </div>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="card" style={{ padding: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', width: '18px', opacity: 0.6 }} />
                        <input
                            type="text"
                            placeholder="Parça kodu veya ürün tanımı ile anlık ara..."
                            className="input-field"
                            style={{
                                paddingLeft: '3.5rem',
                                width: '100%',
                                background: 'var(--background)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '14px'
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stock Table */}
                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ width: '20%', padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KALEM NO</th>
                                <th style={{ width: '50%', padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KALEM TANIMI / ÖZELLİK</th>
                                <th style={{ width: '20%', padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GÜNCEL STOK</th>
                                <th style={{ width: '10%', padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DETAYLAR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <Fragment key={item.id}>
                                    <tr
                                        className="table-row-hover"
                                        style={{
                                            transition: '0.3s',
                                            cursor: 'pointer',
                                            background: expandedItem === item.id ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                                            borderBottom: expandedItem === item.id ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                    >
                                        <td style={{ width: '20%', padding: '1.25rem 1rem', fontWeight: 700, color: 'var(--foreground)', fontSize: '0.9rem' }}>
                                            {item.item_no}
                                        </td>
                                        <td style={{ width: '50%', padding: '1.25rem 1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{item.item_description}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', opacity: 0.7 }}>{item.measurement_description}</div>
                                        </td>
                                        <td style={{ width: '20%', padding: '1.25rem 1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '0.95rem',
                                                fontWeight: 800,
                                                background: (item.quantity || 0) > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: (item.quantity || 0) > 0 ? '#4ade80' : '#ef4444',
                                                border: (item.quantity || 0) > 0 ? '1px solid rgba(74, 222, 128, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                                            }}>
                                                {item.quantity || 0} Adet
                                            </span>
                                        </td>
                                        <td style={{ width: '10%', padding: '1.25rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                                                {expandedItem === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedItem === item.id && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '0', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ padding: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                                        <History size={16} className="text-primary" />
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--primary)' }}>SON 5 STOK HAREKETİ</span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                                        {transactions
                                                            .filter(t => t.item_no === item.item_no && t.item_description === item.item_description)
                                                            .slice(0, 5)
                                                            .map((t, idx) => (
                                                                <div key={idx} className="card" style={{
                                                                    padding: '1rem',
                                                                    background: 'rgba(255,255,255,0.02)',
                                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                                    borderRadius: '12px',
                                                                    boxShadow: 'none'
                                                                }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            padding: '0.2rem 0.5rem',
                                                                            borderRadius: '6px',
                                                                            background: t.transaction_type === 'Giriş' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                            color: t.transaction_type === 'Giriş' ? '#4ade80' : '#ef4444',
                                                                            fontWeight: 800,
                                                                            textTransform: 'uppercase'
                                                                        }}>
                                                                            {t.transaction_type}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', opacity: 0.8 }}>
                                                                            {new Date(t.created_at).toLocaleDateString('tr-TR')}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                                                                        <span style={{ color: t.transaction_type === 'Giriş' ? '#4ade80' : '#ef4444' }}>
                                                                            {t.quantity > 0 ? '+' : ''}{t.quantity}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Adet</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                                                                        {t.reciever_sender}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        {t.location} <ArrowRight size={10} /> {t.department}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        }
                                                        {transactions.filter(t => t.item_no === item.item_no && t.item_description === item.item_description).length === 0 && (
                                                            <div style={{
                                                                gridColumn: '1 / -1',
                                                                padding: '2rem',
                                                                textAlign: 'center',
                                                                color: 'var(--muted-foreground)',
                                                                background: 'rgba(255,255,255,0.01)',
                                                                borderRadius: '12px',
                                                                border: '1px dashed rgba(255,255,255,0.05)'
                                                            }}>
                                                                <History size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                                                <div style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Bu ürün için henüz bir hareket kaydı bulunmuyor.</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main >

            <style jsx>{`
                .loader { 
                    width: 48px; 
                    height: 48px; 
                    border: 5px solid rgba(255,255,255,0.1); 
                    border-top-color: var(--primary); 
                    border-radius: 50%; 
                    animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div >
    )
}
