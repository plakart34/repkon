'use client'

import { useState, useEffect } from 'react'

import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { X, Briefcase, AlertCircle, Calendar } from 'lucide-react'

export default function ProjectModal({ isOpen, onClose, onProjectAdded, initialData = null, isAdmin = false }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        status: 'Aktif',
        progress: 0,
        est_start: '',
        est_shipment: '',
        responsible_engineer: '',
        country_of_origin: '',
        actual_start: '',
        actual_end: ''
    })

    const [profiles, setProfiles] = useState([])

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data } = await supabase.from('profiles').select('*')
            setProfiles(data || [])
        }
        fetchProfiles()
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                status: initialData.status || 'Aktif',
                progress: initialData.progress || 0,
                est_start: initialData.est_start || '',
                est_shipment: initialData.est_shipment || '',
                responsible_engineer: initialData.responsible_engineer || '',
                country_of_origin: initialData.country_of_origin || '',
                actual_start: initialData.actual_start || '',
                actual_end: initialData.actual_end || ''
            })
        } else {
            setFormData({
                name: '',
                status: 'Aktif',
                progress: 0,
                est_start: '',
                est_shipment: '',
                responsible_engineer: '',
                country_of_origin: '',
                actual_start: '',
                actual_end: ''
            })
        }
    }, [initialData, isOpen])

    if (!isOpen || typeof document === 'undefined') return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const dataToSave = {
                ...formData,
                est_start: formData.est_start || null,
                est_shipment: formData.est_shipment || null,
                actual_start: formData.actual_start || null,
                actual_end: formData.actual_end || null
            }

            if (initialData) {
                const { error } = await supabase.from('projects').update(dataToSave).eq('id', initialData.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from('projects').insert([dataToSave]).select()
                if (error) throw error
                onProjectAdded(data[0])
            }
            onClose()
        } catch (err) {
            setError('Hata: Proje kaydedilemedi. ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const isEditing = !!initialData
    const canEdit = !isEditing || isAdmin

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
            <div className="card animate-fade-in" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', maxWidth: '90vw', border: '1px solid var(--border)', background: 'var(--card)', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}>
                            <Briefcase size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {!canEdit && (
                    <div style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <AlertCircle size={14} /> Düzenleme yetkiniz bulunmuyor. Sadece Admin bu alanı değiştirebilir.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>Proje Adı</label>
                        <input
                            required
                            disabled={!canEdit}
                            className="btn"
                            style={{ width: '100%', background: 'var(--secondary)', color: 'white', textAlign: 'left', cursor: canEdit ? 'text' : 'not-allowed', border: '1px solid var(--border)', outline: 'none' }}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder=""
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Tahmini Tarihler</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>T. Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    disabled={!canEdit}
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none', colorScheme: 'dark' }}
                                    value={formData.est_start}
                                    onChange={e => setFormData({ ...formData, est_start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>T. Sevkiyat Tarihi</label>
                                <input
                                    type="date"
                                    disabled={!canEdit}
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none', colorScheme: 'dark' }}
                                    value={formData.est_shipment}
                                    onChange={e => setFormData({ ...formData, est_shipment: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Fiili Tarihler</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>F. Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    disabled={!canEdit}
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none', colorScheme: 'dark' }}
                                    value={formData.actual_start}
                                    onChange={e => setFormData({ ...formData, actual_start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>F. Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    disabled={!canEdit}
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none', colorScheme: 'dark' }}
                                    value={formData.actual_end}
                                    onChange={e => setFormData({ ...formData, actual_end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>Sorumlu Montaj Mühendisi</label>
                            <select
                                disabled={!canEdit}
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none' }}
                                value={formData.responsible_engineer}
                                onChange={e => setFormData({ ...formData, responsible_engineer: e.target.value })}
                            >
                                <option value="">Mühendis Seçin</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.full_name}>{p.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>Menşei Ülke</label>
                            <input
                                disabled={!canEdit}
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none' }}
                                value={formData.country_of_origin}
                                onChange={e => setFormData({ ...formData, country_of_origin: e.target.value })}
                                placeholder="Örn: Türkiye, Almanya"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>Durum</label>
                            <select
                                disabled={!canEdit}
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none' }}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Aktif">Aktif</option>
                                <option value="Beklemede">Beklemede</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem', fontWeight: 500 }}>İlerleme (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!canEdit}
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', outline: 'none' }}
                                value={formData.progress}
                                onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ background: 'var(--secondary)', color: 'white' }}>İptal</button>
                        {canEdit && (
                            <button disabled={loading} className="btn btn-primary">
                                {loading ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Projeyi Başlat')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
