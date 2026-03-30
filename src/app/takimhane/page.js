'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Plus,
    Archive,
    Search,
    AlertTriangle,
    Package,
    ArrowDownLeft,
    ArrowUpRight,
    Edit3,
    Trash2,
    Filter,
    BarChart3
} from 'lucide-react'

export default function TakimhanePage() {
    const { profile, loading: authLoading } = usePermissions()
    const router = useRouter()
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeCategory, setActiveCategory] = useState('Hepsi')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingTool, setEditingTool] = useState(null)

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        category: 'Kesici Takımlar',
        stock_quantity: 0,
        unit: 'Adet',
        min_stock: 5,
        location: '',
        description: ''
    })

    const categories = ['Hepsi', 'Kesici Takımlar', 'Ölçüm Cihazları', 'El Aletleri', 'Sarf Malzemeler', 'Diğer']

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('tools')
            .select('*')
            .order('name')

        if (!error) setTools(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    const handleSave = async (e) => {
        e.preventDefault()
        const data = { ...formData }

        if (editingTool) {
            const { error } = await supabase.from('tools').update(data).eq('id', editingTool.id)
            if (error) alert(error.message)
        } else {
            const { error } = await supabase.from('tools').insert([data])
            if (error) alert(error.message)
        }

        fetchData()
        setIsAddModalOpen(false)
        setEditingTool(null)
        setFormData({ name: '', category: 'Kesici Takımlar', stock_quantity: 0, unit: 'Adet', min_stock: 5, location: '', description: '' })
    }

    const handleDelete = async (id) => {
        if (confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) {
            const { error } = await supabase.from('tools').delete().eq('id', id)
            if (error) alert(error.message)
            fetchData()
        }
    }

    const filteredTools = tools.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = activeCategory === 'Hepsi' || t.category === activeCategory
        return matchesSearch && matchesCategory
    })

    const criticalItems = tools.filter(t => t.stock_quantity <= t.min_stock)

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header">
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takımhane Deposu</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takım, aparat ve stok takibi merkezi.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Ürün Ekle
                    </button>
                </header>

                {/* Stats Section */}
                <section className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Toplam Kalem</p>
                                <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>{tools.length}</h3>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                                <Package size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Kritik Stok</p>
                                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{criticalItems.length}</h3>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px' }}>
                                <AlertTriangle size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Son Giriş</p>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>Uğur Keski Seti</h3>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '12px' }}>
                                <ArrowDownLeft size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Son Çıkış</p>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>CNC-10 Takım</h3>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: '12px' }}>
                                <ArrowUpRight size={24} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filters & Search */}
                <div className="filter-grid" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            type="text"
                            placeholder="Ürün adı veya kod ara..."
                            className="input-field"
                            style={{ paddingLeft: '3rem', width: '100%', marginBottom: 0 }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeCategory === cat ? 'white' : 'var(--muted-foreground)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.81rem',
                                    fontWeight: 600,
                                    transition: '0.2s'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table View */}
                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>Ürün Adı</th>
                                <th style={{ padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>Kategori</th>
                                <th style={{ padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>Stok</th>
                                <th style={{ padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>Konum</th>
                                <th style={{ padding: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>Durum</th>
                                <th style={{ padding: '1.25rem' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTools.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        <Package size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p>Aradığınız kriterlere uygun ürün bulunamadı.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTools.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }}>
                                        <td style={{ padding: '1.25rem' }}>
                                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{item.description || '-'}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem', fontSize: '0.875rem' }}>{item.category}</td>
                                        <td style={{ padding: '1.25rem' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.stock_quantity} <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>{item.unit}</span></div>
                                        </td>
                                        <td style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{item.location || '-'}</td>
                                        <td style={{ padding: '1.25rem' }}>
                                            {item.stock_quantity <= item.min_stock ? (
                                                <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>Düşük Stok</span>
                                            ) : (
                                                <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>Yeterli</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setEditingTool(item); setFormData({ ...item }); setIsAddModalOpen(true); }} className="nav-item" style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="nav-item" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add/Edit Modal */}
                {isAddModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <div className="card animate-scale-in" style={{ width: '500px', maxWidth: '90%', padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <h3 style={{ fontWeight: 800 }}>{editingTool ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h3>
                                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Ürün Adı</label>
                                    <input required className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Kategori</label>
                                        <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            {categories.filter(c => c !== 'Hepsi').map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Birim</label>
                                        <select className="input-field" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                            <option value="Adet">Adet</option>
                                            <option value="Kg">Kg</option>
                                            <option value="Metre">Metre</option>
                                            <option value="Set">Set</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Stok Miktarı</label>
                                        <input type="number" className="input-field" value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Kritik Seviye</label>
                                        <input type="number" className="input-field" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Depo Konumu</label>
                                    <input className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Örn: S-A2 Rafı" />
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>Açıklama</label>
                                    <textarea className="input-field" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3}></textarea>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                    Kaydet
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
