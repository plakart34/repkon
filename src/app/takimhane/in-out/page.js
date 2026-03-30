'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    ArrowLeftRight,
    Plus,
    Search,
    Download,
    ArrowDownCircle,
    ArrowUpCircle,
    History,
    Filter,
    X,
    Calendar,
    User,
    Package,
    Navigation
} from 'lucide-react'

export default function ToolroomInOutPage() {
    const { profile, loading: authLoading } = usePermissions()
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        item_no: '',
        item_description: '',
        measurement_description: '',
        quantity: 1,
        department: '',
        reciever_sender: '',
        location: '',
        type: 'Çıkış' // 'Giriş' or 'Çıkış'
    })

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_transactions')
            .select('*')
            .order('sequence_no', { ascending: false })

        if (!error) setTransactions(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    const handleSave = async (e) => {
        e.preventDefault()
        // Calculate current stock (this is simplified, normally we'd check latest stock)
        // For now, let's just insert as user requested.
        const { error } = await supabase.from('toolroom_transactions').insert([{
            item_no: formData.item_no,
            item_description: formData.item_description,
            measurement_description: formData.measurement_description,
            quantity: formData.type === 'Çıkış' ? -Math.abs(formData.quantity) : Math.abs(formData.quantity),
            department: formData.department,
            reciever_sender: formData.reciever_sender,
            location: formData.location,
            current_stock: 0 // Placeholder or we'd calc this
        }])

        if (error) alert(error.message)
        else {
            setIsModalOpen(false)
            fetchData()
            setFormData({ item_no: '', item_description: '', measurement_description: '', quantity: 1, department: '', reciever_sender: '', location: '', type: 'Çıkış' })
        }
    }

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    const filtered = transactions.filter(t =>
        t.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.item_no?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                            <ArrowLeftRight size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takım Giriş-Çıkış Kayıtları</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Takımhane üzerinden gerçekleştirilen tüm hareketlerin dökümü.</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Hareket İşle
                    </button>
                </header>

                <div className="filter-grid" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            type="text"
                            placeholder="Kalem no veya tanımına göre ara..."
                            className="input-field"
                            style={{ paddingLeft: '3rem', width: '100%', marginBottom: 0 }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Download size={18} style={{ marginRight: '0.5rem' }} /> Excel'e Aktar
                    </button>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Sıra No</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Kalem No</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Kalem Tanımı</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Ölçü Açıklaması</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Miktar</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Bölüm</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Kime / Kimden</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Güncel Miktar</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Lokasyon</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Tarih Saat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center' }}>Yükleniyor...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Kayıt bulunamadı.</td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: '0.2s' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem', opacity: 0.5 }}>{t.sequence_no}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>{t.item_no || '-'}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem' }}>{t.item_description}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{t.measurement_description || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            color: t.quantity > 0 ? '#4ade80' : '#ef4444',
                                            fontSize: '0.9rem', fontWeight: 700
                                        }}>
                                            {t.quantity > 0 ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                                            {Math.abs(t.quantity)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem' }}>{t.department || '-'}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem' }}>{t.reciever_sender || '-'}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 700 }}>{t.current_stock || 0}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem', opacity: 0.7 }}>{t.location || '-'}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                        {new Date(t.transaction_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal Form */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <div className="card animate-scale-in" style={{ width: '600px', maxWidth: '95%', padding: '2.5rem', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--primary)', borderRadius: '10px' }}><Plus size={24} /></div>
                                    <h3 style={{ fontWeight: 800 }}>Yeni Hareket İşle</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={32} /></button>
                            </div>

                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>İşlem Tipi</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'Giriş' })}
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: formData.type === 'Giriş' ? '#4ade80' : 'rgba(255,255,255,0.05)', color: formData.type === 'Giriş' ? 'black' : 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                            >Giriş</button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'Çıkış' })}
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: formData.type === 'Çıkış' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: formData.type === 'Çıkış' ? 'white' : 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                            >Çıkış</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Kalem No</label>
                                        <input className="input-field" value={formData.item_no} onChange={e => setFormData({ ...formData, item_no: e.target.value })} placeholder="Parça Kodu" />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Kalem Tanımı (Ürün Adı)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Package size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                        <input required className="input-field" style={{ paddingLeft: '3rem' }} value={formData.item_description} onChange={e => setFormData({ ...formData, item_description: e.target.value })} placeholder="Ürün Tanımı" />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Ölçü Açıklaması</label>
                                    <input className="input-field" value={formData.measurement_description} onChange={e => setFormData({ ...formData, measurement_description: e.target.value })} placeholder="Ör: 150mm, HSS, etc." />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Miktar</label>
                                        <input type="number" required className="input-field" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Bölüm</label>
                                        <input className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Üretim, CNC, vb." />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Kime / Kimden</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input required className="input-field" style={{ paddingLeft: '3rem' }} value={formData.reciever_sender} onChange={e => setFormData({ ...formData, reciever_sender: e.target.value })} placeholder="Personel Adı" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Lokasyon</label>
                                        <div style={{ position: 'relative' }}>
                                            <Navigation size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input className="input-field" style={{ paddingLeft: '3rem' }} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Depo Konumu" />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', marginTop: '1rem', fontWeight: 800, fontSize: '1rem' }}>
                                    KAYDI ONAYLA VE KAYDET
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
