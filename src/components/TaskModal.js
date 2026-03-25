'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { storage } from '@/lib/storage'
import { X, CheckSquare, AlertCircle } from 'lucide-react'

export default function TaskModal({ isOpen, onClose, projects, onTaskAdded, isMock = false }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        projectId: '',
        status: 'Sırada',
        due_date: '',
        assigned_to: ''
    })

    if (!isOpen || typeof document === 'undefined') return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isMock) {
                await new Promise(res => setTimeout(res, 500))
                const newTask = storage.saveTask(formData)
                onTaskAdded(newTask)
                onClose()
            }
        } catch (err) {
            setError('Hata: Görev kaydedilemedi.')
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
            <div className="card animate-fade-in" style={{ width: '500px', maxWidth: '90vw', border: '1px solid var(--border)', background: 'var(--card)', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}>
                            <CheckSquare size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Yeni Görev Ekle</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Görev Başlığı</label>
                        <input
                            required
                            style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Yapılacak iş..."
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>İlgili Proje (Opsiyonel)</label>
                        <select
                            style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                            value={formData.projectId}
                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                        >
                            <option value="">Proje Seçin</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Durum</label>
                            <select
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Sırada">Sırada</option>
                                <option value="Yapılıyor">Yapılıyor</option>
                                <option value="İncelemede">İncelemede</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Teslim Tarihi</label>
                            <input
                                type="date"
                                style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', colorScheme: 'dark' }}
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ background: 'var(--secondary)', color: 'white' }}>İptal</button>
                        <button disabled={loading} className="btn btn-primary">
                            {loading ? 'Kaydediliyor...' : 'Görev Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
