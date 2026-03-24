'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { storage } from '@/lib/storage'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Plus,
    ArrowLeft,
    Settings,
    Cpu,
    ChevronRight,
    MoreVertical,
    Activity,
    Calendar,
    Truck,
    Edit3,
    Trash2
} from 'lucide-react'

export default function ProjectDetail() {
    const { id } = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()
    const [project, setProject] = useState(null)
    const [machines, setMachines] = useState([])
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false)
    const [activeMenuId, setActiveMenuId] = useState(null)
    const [editingMachine, setEditingMachine] = useState(null)

    // Machine Form
    const [newMachine, setNewMachine] = useState({ name: '', model: '', status: 'Üretimde' })

    useEffect(() => {
        if (profile && id) {
            const projects = storage.getProjects()
            const current = projects.find(p => p.id === id)
            if (current) {
                setProject(current)
                setMachines(storage.getMachines(id))
            }
        }

        const handleOutsideClick = () => setActiveMenuId(null)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsMachineModalOpen(false)
                setEditingMachine(null)
                setActiveMenuId(null)
            }
        }

        window.addEventListener('click', handleOutsideClick)
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('click', handleOutsideClick)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [profile, id])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile || !project) return null

    const handleAddMachine = (e) => {
        e.preventDefault()
        if (!newMachine.name) return

        if (editingMachine) {
            storage.updateMachine({
                ...editingMachine,
                ...newMachine
            })
        } else {
            storage.saveMachine({
                ...newMachine,
                projectId: id
            })
        }

        setMachines(storage.getMachines(id))
        setNewMachine({ name: '', model: '', status: 'Üretimde' })
        setEditingMachine(null)
        setIsMachineModalOpen(false)
    }

    const handleDeleteMachine = (mId) => {
        if (confirm('Bu makineyi silmek istediğinize emin misiniz?')) {
            storage.deleteMachine(mId)
            setMachines(storage.getMachines(id))
            setActiveMenuId(null)
        }
    }

    const handleEditMachine = (m) => {
        setEditingMachine(m)
        setNewMachine({ name: m.name, model: m.model, status: m.status })
        setIsMachineModalOpen(true)
        setActiveMenuId(null)
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <button onClick={() => router.push('/projects')} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0 }}>
                            <ArrowLeft size={16} /> Klasörlere Dön
                        </button>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{project.name}</h2>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            <span className="status-badge status-active">{project.status}</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                                <Calendar size={14} /> {project.estStart || '-'}
                                <span style={{ margin: '0 0.5rem' }}>/</span>
                                <Truck size={14} /> {project.estShipment || '-'}
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsMachineModalOpen(true)}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Makine Ekle
                    </button>
                </header>

                <section style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Proje Makineleri</h3>
                    </div>

                    <div className="project-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                        {machines.map(m => (
                            <div
                                key={m.id}
                                className="card"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onClick={() => router.push(`/projects/${id}/machines/${m.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.75rem' }}>
                                        <Cpu size={24} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === m.id ? null : m.id);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeMenuId === m.id && (
                                            <div
                                                className="card animate-fade-in"
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: '100%',
                                                    zIndex: 10,
                                                    minWidth: '160px',
                                                    padding: '0.5rem',
                                                    background: '#18181b',
                                                    border: '1px solid var(--border)',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => handleEditMachine(m)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem', borderRadius: 'var(--radius)' }}
                                                    className="nav-item"
                                                >
                                                    <Edit3 size={16} color="#3b82f6" /> Düzenle
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMachine(m.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', borderRadius: 'var(--radius)' }}
                                                    className="nav-item"
                                                >
                                                    <Trash2 size={16} /> Sil
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700 }}>{m.name}</h4>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Model: {m.model || 'Belirtilmemiş'}</p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>
                                        <Activity size={12} style={{ marginRight: '0.25rem' }} /> {m.status}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {machines.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', color: 'var(--muted-foreground)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                                Henüz makine eklenmedi.
                            </div>
                        )}
                    </div>
                </section>

                {isMachineModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                        <div className="card animate-fade-in" style={{ width: '450px', padding: '2.5rem', background: 'var(--card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}>
                                        <Cpu size={20} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingMachine ? 'Makineyi Düzenle' : 'Yeni Makine Ekle'}</h3>
                                </div>
                                <button onClick={() => { setIsMachineModalOpen(false); setEditingMachine(null); setNewMachine({ name: '', model: '', status: 'Üretimde' }); }} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                    <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                                </button>
                            </div>

                            <form onSubmit={handleAddMachine}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Makine Adı</label>
                                    <input
                                        required
                                        style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                        value={newMachine.name}
                                        onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                                        placeholder=""
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Model / Seri No</label>
                                    <input
                                        style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                        value={newMachine.model}
                                        onChange={e => setNewMachine({ ...newMachine, model: e.target.value })}
                                        placeholder=""
                                    />
                                </div>
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Durum</label>
                                    <select
                                        style={{ width: '100%', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                        value={newMachine.status}
                                        onChange={e => setNewMachine({ ...newMachine, status: e.target.value })}
                                    >
                                        <option value="Üretimde">Üretimde</option>
                                        <option value="Montaj">Montaj</option>
                                        <option value="Test">Test</option>
                                        <option value="Sevkiyata Hazır">Sevkiyata Hazır</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button type="button" onClick={() => { setIsMachineModalOpen(false); setEditingMachine(null); setNewMachine({ name: '', model: '', status: 'Üretimde' }); }} className="btn" style={{ background: 'var(--secondary)', color: 'white' }}>İptal</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>
                                        {editingMachine ? 'Değişiklikleri Kaydet' : 'Makineyi Kaydet'}
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
