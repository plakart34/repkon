'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Database,
    Plus,
    Search,
    Download,
    Edit2,
    Trash2,
    X,
    Filter,
    Package,
    BarChart3,
    Tag,
    MapPin,
    Calendar,
    CircleDollarSign,
    Menu,
    AlertTriangle
} from 'lucide-react'

export default function ToolroomDatesheetPage() {
    const { profile, loading: authLoading } = usePermissions()
    const router = useRouter()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_datesheet') || profile?.roles?.name === 'Admin'
    const canManage = profile?.roles?.permissions?.includes('manage_toolroom_items') || profile?.roles?.name === 'Admin'

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)

    const [formData, setFormData] = useState({
        manufacturer_code: '',
        item_no: '',
        item_description: '',
        measurement_description: '',
        supplier: '',
        price: '',
        main_group: '',
        sub_group_1: '',
        sub_group_2: '',
        quantity: 0,
        critical_stock: 0,
        location: '',
        count_date: new Date().toISOString().split('T')[0]
    })

    const [definitions, setDefinitions] = useState([])

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_items')
            .select('*')
            .order('sequence_no', { ascending: false })

        if (!error) setItems(data || [])

        const { data: defData } = await supabase
            .from('toolroom_definitions')
            .select('*')
            .order('value', { ascending: true })

        if (defData) setDefinitions(defData)

        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    const getDefOptions = (type, parentValue = null) => {
        if (!parentValue) {
            // Only return items with NO parent if parentValue is null (except for Main Group)
            return definitions.filter(d => d.type === type).map(d => d.value)
        }

        // Find parent ID by its value
        const parent = definitions.find(d => d.value === parentValue)
        if (!parent) return []

        return definitions.filter(d => d.type === type && d.parent_id === parent.id).map(d => d.value)
    }

    const handleOpenModal = (item = null) => {
        if (item && !canManage) {
            alert('Bu ürünü düzenlemek için yetkiniz bulunmamaktadır.');
            return;
        }
        if (!item && !canManage) {
            alert('Yeni ürün eklemek için yetkiniz bulunmamaktadır.');
            return;
        }
        if (item) {
            setEditingItem(item)
            setFormData({
                manufacturer_code: item.manufacturer_code || '',
                item_no: item.item_no || '',
                item_description: item.item_description || '',
                measurement_description: item.measurement_description || '',
                supplier: item.supplier || '',
                price: item.price || '',
                main_group: item.main_group || '',
                sub_group_1: item.sub_group_1 || '',
                sub_group_2: item.sub_group_2 || '',
                quantity: item.quantity || 0,
                critical_stock: item.critical_stock || 0,
                location: item.location || '',
                count_date: item.count_date ? new Date(item.count_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            })
        } else {
            setEditingItem(null)
            setFormData({
                manufacturer_code: '',
                item_no: '',
                item_description: '',
                measurement_description: '',
                supplier: '',
                price: '',
                main_group: '',
                sub_group_1: '',
                sub_group_2: '',
                quantity: 0,
                critical_stock: 0,
                location: '',
                count_date: new Date().toISOString().split('T')[0]
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        const payload = {
            ...formData,
            price: formData.price === '' ? null : parseFloat(formData.price),
            quantity: parseInt(formData.quantity) || 0,
            critical_stock: parseInt(formData.critical_stock) || 0
        }

        let error
        if (editingItem) {
            const { error: err } = await supabase
                .from('toolroom_items')
                .update(payload)
                .eq('id', editingItem.id)
            error = err
        } else {
            const { error: err } = await supabase
                .from('toolroom_items')
                .insert([payload])
            error = err
        }

        if (error) alert(error.message)
        else {
            setIsModalOpen(false)
            fetchData()
        }
    }

    const handleDelete = async (id) => {
        if (!canManage) {
            alert('Silme yetkiniz bulunmamaktadır.');
            return;
        }
        if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
        const { error } = await supabase.from('toolroom_items').delete().eq('id', id)
        if (error) alert(error.message)
        else {
            setIsModalOpen(false)
            fetchData()
        }
    }

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    const filtered = items.filter(t =>
        t.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.manufacturer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Shield style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane Datasheet modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takımhane Datasheet</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Takımhane envanter kataloğu ve detaylı ürün listesi.</p>
                        </div>
                    </div>
                    {canManage && (
                        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                            <Plus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Ürün Ekle
                        </button>
                    )}
                </header>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '2rem',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '1rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ position: 'relative', width: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', opacity: 0.6 }} />
                            <input
                                type="text"
                                placeholder="Kalem No, Tanım, Üretici veya Tedarikçi ara..."
                                className="input-field"
                                style={{
                                    paddingLeft: '3.25rem',
                                    background: 'var(--background)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary" style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Filter size={18} style={{ marginRight: '0.5rem' }} /> Filtrele
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Download size={18} style={{ marginRight: '0.5rem' }} /> Excel'e Aktar
                        </button>
                    </div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Sıra No</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Üretici Kodu</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Kalem No</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Kalem Tanımı</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Ölçü Açıklaması</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Tedarikçi</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Fiyat</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Ana Grup</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Ara Grup</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Alt Grup</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Miktar</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Kritik Seviye</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Lokasyon</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Sayım Tarihi</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', textAlign: 'center' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="15" style={{ padding: '3rem', textAlign: 'center' }}>Yükleniyor...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="15" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Kayıt bulunamadı.</td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: '0.2s', cursor: 'pointer' }} className="table-row-hover" onClick={() => handleOpenModal(t)}>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>{t.sequence_no}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.manufacturer_code || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>{t.item_no || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.item_description}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t.measurement_description || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.supplier || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.price ? `${t.price} ₺` : '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.main_group || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.sub_group_1 || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.sub_group_2 || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.quantity || 0}
                                            {t.quantity <= (t.critical_stock || 0) && t.quantity > 0 && <AlertTriangle size={14} style={{ color: '#f59e0b' }} title="Kritik Seviye Altında!" />}
                                            {t.quantity === 0 && <AlertTriangle size={14} style={{ color: '#ef4444' }} title="Stok Tükendi!" />}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{t.critical_stock || 0}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>{t.location || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                        {t.count_date ? new Date(t.count_date).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            {canManage && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenModal(t)}
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                        title="Düzenle"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal Form */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <div className="card animate-scale-in" style={{ width: '800px', maxWidth: '95%', padding: '2.5rem', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--primary)', borderRadius: '10px' }}><Plus size={24} /></div>
                                    <h3 style={{ fontWeight: 800 }}>{editingItem ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={32} /></button>
                            </div>

                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Üretici Kodu</label>
                                        <input className="input-field" value={formData.manufacturer_code} onChange={e => setFormData({ ...formData, manufacturer_code: e.target.value })} placeholder="Kod" />
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
                                        <input required className="input-field" style={{ paddingLeft: '3rem' }} value={formData.item_description} onChange={e => setFormData({ ...formData, item_description: e.target.value })} placeholder="Ürün Adı" />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Ölçü Açıklaması</label>
                                    <input className="input-field" value={formData.measurement_description} onChange={e => setFormData({ ...formData, measurement_description: e.target.value })} placeholder="150mm, HSS, etc." />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Tedarikçi</label>
                                        <select className="input-field" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })}>
                                            <option value="">Seçiniz...</option>
                                            {getDefOptions('supplier').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Fiyat</label>
                                        <div style={{ position: 'relative' }}>
                                            <CircleDollarSign size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input type="number" className="input-field" style={{ paddingLeft: '3rem' }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Ana Grup</label>
                                        <select
                                            className="input-field"
                                            value={formData.main_group}
                                            onChange={e => setFormData({ ...formData, main_group: e.target.value, sub_group_1: '', sub_group_2: '' })}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {getDefOptions('main_group').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Ara Grup</label>
                                        <select
                                            className="input-field"
                                            value={formData.sub_group_1}
                                            onChange={e => setFormData({ ...formData, sub_group_1: e.target.value, sub_group_2: '' })}
                                            disabled={!formData.main_group}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {getDefOptions('sub_group_1', formData.main_group).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Alt Grup</label>
                                        <select
                                            className="input-field"
                                            value={formData.sub_group_2}
                                            onChange={e => setFormData({ ...formData, sub_group_2: e.target.value })}
                                            disabled={!formData.sub_group_1}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {getDefOptions('sub_group_2', formData.sub_group_1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Miktar</label>
                                        <input type="number" required className="input-field" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Kritik Stok</label>
                                        <input type="number" className="input-field" style={{ color: '#f59e0b', fontWeight: 700 }} value={formData.critical_stock} onChange={e => setFormData({ ...formData, critical_stock: parseInt(e.target.value) })} placeholder="Min. Seviye" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Sayım Tarihi</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input type="date" className="input-field" style={{ paddingLeft: '3rem' }} value={formData.count_date} onChange={e => setFormData({ ...formData, count_date: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Lokasyon</label>
                                        <select className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}>
                                            <option value="">Seçiniz...</option>
                                            {getDefOptions('location').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    {editingItem && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(editingItem.id)}
                                            className="btn btn-secondary"
                                            style={{ flex: 1, padding: '1.25rem', fontWeight: 800, color: '#ef4444', borderColor: '#ef4444' }}
                                        >
                                            <Trash2 size={20} style={{ marginRight: '0.5rem' }} /> SİL
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary" style={{ flex: editingItem ? 2 : 1, padding: '1.25rem', fontWeight: 800, fontSize: '1rem' }}>
                                        {editingItem ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ÜRÜNÜ SİSTEME EKLE'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
