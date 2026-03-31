'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { usePermissions } from '@/hooks/usePermissions'
import {
    Plus,
    Trash2,
    Settings,
    ChevronRight,
    Tag,
    Layers,
    MapPin,
    Truck,
    FolderTree,
    Database,
    ArrowRight,
    Briefcase
} from 'lucide-react'

const CATEGORIES = [
    { type: 'supplier', label: 'Tedarikçiler', icon: <Truck size={18} />, parentType: null },
    { type: 'main_group', label: 'Ana Gruplar', icon: <Database size={18} />, parentType: null },
    { type: 'sub_group_1', label: 'Ara Gruplar', icon: <FolderTree size={18} />, parentType: 'main_group' },
    { type: 'sub_group_2', label: 'Alt Gruplar', icon: <Layers size={18} />, parentType: 'sub_group_1' },
    { type: 'project', label: 'Projeler', icon: <Briefcase size={18} />, parentType: null },
    { type: 'machine', label: 'Makineler', icon: <Settings size={18} />, parentType: 'project' },
    { type: 'location', label: 'Genel Lokasyonlar', icon: <MapPin size={18} />, parentType: null },
]

export default function ToolroomDefinitionsPage() {
    const { profile, loading: authLoading } = usePermissions()
    const canView = profile?.roles?.permissions?.includes('view_toolroom_definitions') || profile?.roles?.name === 'Admin'
    const [definitions, setDefinitions] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('supplier')
    const [newValue, setNewValue] = useState('')
    const [parentId, setParentId] = useState('')

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_definitions')
            .select('*')
            .order('value', { ascending: true })

        if (!error) setDefinitions(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (profile && canView) fetchData()
    }, [profile, canView])

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Settings style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane tanımlama modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => window.location.href = '/'}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!newValue.trim()) return

        const payload = {
            type: activeTab,
            value: newValue.trim()
        }

        const category = CATEGORIES.find(c => c.type === activeTab)
        if (category.parentType && parentId) {
            payload.parent_id = parentId
        } else if (category.parentType && !parentId) {
            alert('Lütfen bir üst grup seçin.')
            return
        }

        const { error } = await supabase.from('toolroom_definitions').insert([payload])

        if (!error) {
            setNewValue('')
            setParentId('')
            fetchData()
        } else {
            alert(error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Bu tanımı silmek istediğinizden emin misiniz?')) return
        const { error } = await supabase.from('toolroom_definitions').delete().eq('id', id)
        if (!error) fetchData()
    }

    const category = CATEGORIES.find(c => c.type === activeTab)
    const filtered = definitions.filter(d => d.type === activeTab)
    const parentOptions = category.parentType ? definitions.filter(d => d.type === category.parentType) : []

    const getParentName = (parentId) => {
        const parent = definitions.find(d => d.id === parentId)
        return parent ? parent.value : 'Tanımsız Üst Grup'
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                            <Settings size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takımhane Tanımlamaları</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Ürün kaydı sırasında seçilecek olan ortak veri alanlarını yönetin.</p>
                        </div>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
                    {/* Categories Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.type}
                                onClick={() => { setActiveTab(cat.type); setNewValue(''); setParentId(''); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '12px',
                                    background: activeTab === cat.type ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: activeTab === cat.type ? 'var(--primary)' : 'var(--muted-foreground)',
                                    border: '1px solid',
                                    borderColor: activeTab === cat.type ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    fontWeight: activeTab === cat.type ? 700 : 500
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {cat.icon}
                                    {cat.label}
                                </div>
                                <ChevronRight size={16} />
                            </button>
                        ))}
                    </div>

                    {/* Active List */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {category?.icon}
                            {category?.label}
                        </h3>

                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {category.parentType && (
                                    <select
                                        className="input-field"
                                        style={{ width: '250px', borderRadius: '12px' }}
                                        value={parentId}
                                        onChange={e => setParentId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Üst Grup Seçin --</option>
                                        {parentOptions.map(p => (
                                            <option key={p.id} value={p.id}>{p.value}</option>
                                        ))}
                                    </select>
                                )}
                                <input
                                    placeholder={`${category?.label} için yeni değer yazın...`}
                                    className="input-field"
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    style={{ flex: 1, borderRadius: '12px' }}
                                    required
                                />
                                <button className="btn btn-primary" type="submit" style={{ borderRadius: '12px', padding: '0 2rem', height: '42px' }}>
                                    <Plus size={20} style={{ marginRight: '0.5rem' }} /> EKLE
                                </button>
                            </div>
                            {category.parentType && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '-0.5rem' }}>
                                    Not: {category.label} bir üst gruba bağlıdır. Lütfen önce bir üst grup seçin.
                                </p>
                            )}
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Yükleniyor...</div>
                            ) : filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, border: '1px dashed var(--border)', borderRadius: '12px' }}>
                                    Henüz tanımlı değer bulunmamaktadır.
                                </div>
                            ) : filtered.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem 1.25rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        transition: '0.2s'
                                    }}
                                    className="table-row-hover"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {category.parentType && (
                                            <>
                                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: 600 }}>
                                                    {getParentName(item.parent_id)}
                                                </span>
                                                <ArrowRight size={14} style={{ opacity: 0.5 }} />
                                            </>
                                        )}
                                        <span style={{ fontWeight: 500, opacity: 0.9 }}>{item.value}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, transition: '0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
