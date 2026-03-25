'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    ArrowLeft,
    Shield,
    Check,
    X,
    Plus,
    HelpCircle,
    AlertTriangle,
    Edit3,
    Trash2,
    Settings
} from 'lucide-react'

export default function RolesPage() {
    const { profile, loading: authLoading } = usePermissions()
    const router = useRouter()
    const [roles, setRoles] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalData, setModalData] = useState({ id: null, name: '', description: '', permissions: [] })

    const permissionGroups = [
        {
            groupName: 'Genel & Dashboard',
            permissions: [
                { path: 'view_dashboard', name: 'Dashboard Görüntüleme' },
                { path: 'view_logs', name: 'Sistem Logları Görüntüleme' }
            ]
        },
        {
            groupName: 'Proje & Ana Modüller',
            permissions: [
                { path: 'view_projects', name: 'Projeleri Görüntüleme' },
                { path: 'create_project', name: 'Projeleri Oluşturma & Ekleme' },
                { path: 'edit_project', name: 'Projeleri Düzenleme' },
                { path: 'delete_project', name: 'Projeleri Silme' }
            ]
        },
        {
            groupName: 'Makine & BOM Yönetimi',
            permissions: [
                { path: 'view_machine', name: 'Makineleri Görüntüleme' },
                { path: 'create_machine', name: 'Makine Oluşturma & Ekleme' },
                { path: 'edit_machine', name: 'Makine Düzenleme' },
                { path: 'delete_machine', name: 'Makine Silme' },
                { path: 'manage_bom', name: 'eBOM / mBOM Listesi Düzenleme' },
                { path: 'manage_folders', name: 'Özel Klasör Oluşturma' }
            ]
        },
        {
            groupName: 'Çalıştay & Operasyonlar',
            permissions: [
                { path: 'view_workshop', name: 'Çalıştay İşlemlerini Görüntüleme' },
                { path: 'view_tasks', name: 'İş Takibi (Kanban & Takvim) Görüntüleme' },
                { path: 'create_operation', name: 'Yeni Aksiyon/Süreç Başlatma' },
                { path: 'edit_operation', name: 'Aksiyon & İş Düzenleme' },
                { path: 'delete_operation', name: 'Aksiyon & İş Silme' },
                { path: 'update_status', name: 'İş Statüsü (Modu) Güncelleme' }
            ]
        },
        {
            groupName: 'Ekip Yönetimi & Rol Atama',
            permissions: [
                { path: 'view_team', name: 'Ekip Görüntüleme' },
                { path: 'manage_team', name: 'Personel Özelliklerini Düzenleme' },
                { path: 'create_staff', name: 'Yeni Personel (Görevli) Ekleme' },
                { path: 'manage_roles', name: 'Rol ve Sayfa Yetkisi Düzenleme' }
            ]
        }
    ]

    const fetchData = async () => {
        const { data } = await supabase.from('roles').select('*').order('name')
        setRoles(data || [])
    }

    useEffect(() => {
        if (profile) {
            fetchData()
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [profile])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const handleSaveRole = async (e) => {
        e.preventDefault()
        if (profile.roles?.name !== 'Admin') return

        if (modalData.id) {
            const { error } = await supabase.from('roles').update({
                name: modalData.name,
                description: modalData.description,
                permissions: modalData.permissions
            }).eq('id', modalData.id)
            if (error) alert(error.message)
        } else {
            const { error } = await supabase.from('roles').insert([{
                name: modalData.name,
                description: modalData.description,
                permissions: modalData.permissions
            }])
            if (error) alert(error.message)
        }

        fetchData()
        setIsModalOpen(false)
        setModalData({ id: null, name: '', description: '', permissions: [] })
    }

    const handleDeleteRole = async (id) => {
        if (profile.roles?.name !== 'Admin') return
        if (window.confirm('Bu rolü silmek istediğinize emin misiniz?')) {
            const { error } = await supabase.from('roles').delete().eq('id', id)
            if (error) alert(error.message)
            fetchData()
        }
    }

    const openEditModal = (role) => {
        setModalData(role)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        setModalData({ id: null, name: '', description: '', permissions: ['view_dashboard'] })
        setIsModalOpen(true)
    }

    const handleTogglePermission = async (roleId, path) => {
        if (profile.roles?.name !== 'Admin') return

        const role = roles.find(r => r.id === roleId)
        if (role) {
            const currentPerms = role.permissions || []
            let newPerms
            if (currentPerms.includes(path)) {
                newPerms = currentPerms.filter(p => p !== path)
            } else {
                newPerms = [...currentPerms, path]
            }

            // Optimistic update
            setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: newPerms } : r))

            const { error } = await supabase.from('roles').update({ permissions: newPerms }).eq('id', roleId)
            if (error) {
                alert(error.message)
                fetchData() // Rollback
            }
        }
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <button onClick={() => router.push('/team')} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0 }}>
                            <ArrowLeft size={16} /> Ekip Sayfasına Dön
                        </button>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Rol ve Yetki Yönetimi</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Sistemdeki kullanıcı rollerinin sayfa bazlı erişimlerini düzenleyin.</p>
                    </div>
                    {profile.roles?.name === 'Admin' && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Yeni Rol Tanımla
                        </button>
                    )}
                </header>

                <section>
                    {profile.roles?.name !== 'Admin' && (
                        <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', borderRadius: 'var(--radius)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertTriangle size={20} />
                            <p style={{ fontSize: '0.875rem' }}>Yetkileri değiştirmek için sadece **Admin** rolü yetkilidir. Görüntüleme modundasınız.</p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                        {roles.map(role => (
                            <div key={role.id} className="card" style={{ padding: '2rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}>
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{role.name}</h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{role.description}</p>
                                        </div>
                                    </div>

                                    {profile.roles?.name === 'Admin' && role.name !== 'Admin' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditModal(role)}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--secondary)' }}
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRole(role.id)}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: '1.5rem', background: 'var(--secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                        İzin Verilen Sayfalar
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {permissionGroups.map((group, gIdx) => (
                                            <div key={gIdx}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                                    {group.groupName}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {group.permissions.map(item => {
                                                        const isAllowed = role.permissions?.includes(item.path) || role.name === 'Admin'

                                                        return (
                                                            <div
                                                                key={item.path}
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '0.6rem 0.75rem',
                                                                    borderRadius: 'var(--radius)',
                                                                    background: isAllowed ? 'rgba(59, 130, 246, 0.05)' : 'var(--card)',
                                                                    cursor: (profile.roles?.name === 'Admin' && role.name !== 'Admin') ? 'pointer' : 'default',
                                                                    transition: 'all 0.2s',
                                                                    border: '1px solid',
                                                                    borderColor: isAllowed ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (role.name === 'Admin') return // Cannot change Admin
                                                                    handleTogglePermission(role.id, item.path)
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '0.8rem', color: isAllowed ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: isAllowed ? 600 : 400 }}>{item.name}</span>
                                                                <div style={{ width: '28px', height: '14px', borderRadius: '10px', background: isAllowed ? 'var(--primary)' : 'var(--secondary)', position: 'relative', transition: '0.3s' }}>
                                                                    <div style={{
                                                                        width: '10px',
                                                                        height: '10px',
                                                                        borderRadius: '50%',
                                                                        background: 'white',
                                                                        position: 'absolute',
                                                                        top: '2px',
                                                                        left: isAllowed ? '16px' : '2px',
                                                                        transition: '0.3s'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '450px', padding: '2.5rem', background: 'var(--card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}>
                                    <Shield size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{modalData.id ? 'Rolü Düzenle' : 'Yeni Rol Oluştur'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRole}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Rol Adı</label>
                                <input
                                    required
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                    value={modalData.name}
                                    onChange={e => setModalData({ ...modalData, name: e.target.value })}
                                    placeholder="Örn: Operatör"
                                />
                            </div>
                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Açıklama</label>
                                <textarea
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', minHeight: '80px' }}
                                    value={modalData.description}
                                    onChange={e => setModalData({ ...modalData, description: e.target.value })}
                                    placeholder="Rolün görev tanımı..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>İptal</button>
                                <button type="submit" className="btn btn-primary">
                                    {modalData.id ? 'Değişiklikleri Kaydet' : 'Rolu Oluştur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
