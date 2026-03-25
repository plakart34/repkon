'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import ProjectModal from '@/components/ProjectModal'
import {
    Folder,
    Plus,
    Search,
    MoreVertical,
    Calendar,
    Truck,
    Edit3,
    Trash2,
    User,
    Globe
} from 'lucide-react'

export default function ProjectsPage() {
    const { profile, loading: authLoading } = usePermissions()
    const router = useRouter()
    const [projects, setProjects] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeMenuId, setActiveMenuId] = useState(null)
    const [editingProject, setEditingProject] = useState(null)

    const fetchData = async () => {
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
        setProjects(data || [])
    }

    useEffect(() => {
        if (profile) fetchData()

        const handleOutsideClick = () => setActiveMenuId(null)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false)
                setEditingProject(null)
                setActiveMenuId(null)
            }
        }

        window.addEventListener('click', handleOutsideClick)
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('click', handleOutsideClick)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [profile])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const isAdmin = profile.roles?.name === 'Admin'
    const canCreateProject = isAdmin || profile.roles?.permissions?.includes('create_project')
    const canEditProject = isAdmin || profile.roles?.permissions?.includes('edit_project')

    const handleEditProject = (proj) => {
        setEditingProject(proj)
        setIsModalOpen(true)
        setActiveMenuId(null)
    }

    const handleDeleteProject = async (id) => {
        if (confirm('Bu projeyi ve içindeki tüm verileri silmek istediğinize emin misiniz?')) {
            const { error } = await supabase.from('projects').delete().eq('id', id)
            if (error) alert(error.message)
            fetchData()
            setActiveMenuId(null)
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingProject(null)
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Proje Klasörleri</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Her proje bir klasör olarak yönetilmektedir.</p>
                    </div>
                    {canCreateProject && (
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                            <Plus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Proje
                        </button>
                    )}
                </header>

                <div className="project-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {projects.map(proj => (
                        <div
                            key={proj.id}
                            className="card"
                            style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
                            onClick={() => router.push(`/projects/${proj.id}`)}
                            onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ color: '#facc15' }}>
                                        <Folder size={48} fill="rgba(250, 204, 21, 0.2)" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{proj.name}</h4>
                                        <span className={`status-badge ${proj.status === 'Aktif' ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.25rem' }}>
                                            {proj.status}
                                        </span>
                                    </div>
                                </div>

                                {canEditProject && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeMenuId === proj.id && (
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
                                                    onClick={() => handleEditProject(proj)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem', borderRadius: 'var(--radius)' }}
                                                    className="nav-item"
                                                >
                                                    <Edit3 size={16} color="#3b82f6" /> Düzenle
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(proj.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', borderRadius: 'var(--radius)' }}
                                                    className="nav-item"
                                                >
                                                    <Trash2 size={16} /> Sil
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                    <div style={{ marginBottom: '0.25rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>Tahmini</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={12} /> <span>{proj.est_start || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <Truck size={12} /> <span>{proj.est_shipment || '-'}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                    <div style={{ marginBottom: '0.25rem', color: '#4ade80', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>Fiili</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={12} /> <span>{proj.actual_start || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <Calendar size={12} /> <span>{proj.actual_end || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                                <User size={14} style={{ color: 'var(--primary)' }} /> <span>{proj.responsible_engineer || 'Atanmadı'}</span>
                                <Globe size={14} style={{ color: 'var(--primary)' }} /> <span>{proj.country_of_origin || '-'}</span>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <div style={{ height: '4px', background: 'var(--secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${proj.progress}%`, height: '100%', background: 'var(--primary)' }} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {projects.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', color: 'var(--muted-foreground)' }}>
                            Henüz proje klasörü bulunmuyor.
                        </div>
                    )}
                </div>

            </main>
            <ProjectModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onProjectAdded={fetchData}
                initialData={editingProject}
                isAdmin={isAdmin}
                isMock={false}
            />
        </div>
    )
}
