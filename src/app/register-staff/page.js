'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    UserPlus,
    ArrowLeft,
    Folder,
    Phone,
    Mail,
    Search,
    Briefcase,
    ChevronRight,
    ShieldCheck,
    Building,
    Hash,
    ToggleLeft,
    X,
    User,
    FolderPlus,
    Edit2,
    Trash2
} from 'lucide-react'

export default function RegisterStaff() {
    const { profile, loading: authLoading } = usePermissions()
    const router = useRouter()
    const [members, setMembers] = useState([])
    const [roles, setRoles] = useState([])
    const [departments, setDepartments] = useState([])
    const [selectedDept, setSelectedDept] = useState(null)

    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
    const [editingDept, setEditingDept] = useState(null) // Stores the old name if editing
    const [newDeptName, setNewDeptName] = useState('')

    // Registration Form
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        extension: '',
        business_phone: '',
        task_description: '',
        role_id: '',
        department: '',
        can_login: false
    })

    const fetchData = async () => {
        const { data: profData } = await supabase.from('profiles').select(`
            *,
            roles (name, permissions)
        `)
        const { data: roleData } = await supabase.from('roles').select('*')
        const { data: deptData } = await supabase.from('depts').select('*')

        setMembers(profData || [])
        setRoles(roleData || [])
        setDepartments((deptData || []).map(d => d.name))
    }

    useEffect(() => {
        if (profile) {
            fetchData()
        }
    }, [profile])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const handleRegister = async (e) => {
        e.preventDefault()
        const fullEmail = formData.email.includes('@') ? formData.email : `${formData.email}@repkon.com.tr`

        try {
            let authId = null;
            if (formData.can_login) {
                const { data: authUser, error: authErr } = await supabase.auth.signUp({
                    email: fullEmail,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.full_name
                        }
                    }
                })
                if (authErr) throw authErr;
                authId = authUser.user.id;
            }

            const { error: profErr } = await supabase.from('profiles').insert({
                id: authId || undefined, // Supabase allows null or let it be if not can_login? 
                // Wait, if not can_login, I should still have a record.
                full_name: formData.full_name,
                email: fullEmail,
                phone: formData.phone,
                extension: formData.extension,
                business_phone: formData.business_phone,
                task_description: formData.task_description,
                role_id: formData.role_id || null,
                department: selectedDept,
                can_login: formData.can_login
            })

            if (profErr) throw profErr;

            fetchData()
            setIsStaffModalOpen(false)
            setFormData({ ...formData, full_name: '', email: '', password: '', phone: '', extension: '', business_phone: '', task_description: '', role_id: '', can_login: false })
            alert('Personel kaydı başarıyla tamamlandı.')
        } catch (err) {
            alert('Kayıt Hatası: ' + err.message)
        }
    }

    const handleSaveDept = async (e) => {
        e.preventDefault()
        if (!newDeptName) return

        try {
            if (editingDept) {
                // Update dept name in depts table and all profiles in that dept
                const { error: deptErr } = await supabase.from('depts').update({ name: newDeptName }).eq('name', editingDept)
                if (deptErr) throw deptErr;
                await supabase.from('profiles').update({ department: newDeptName }).eq('department', editingDept)
            } else {
                const { error: deptErr } = await supabase.from('depts').insert({ name: newDeptName })
                if (deptErr) throw deptErr;
            }

            fetchData()
            setIsDeptModalOpen(false)
            setEditingDept(null)
            setNewDeptName('')
            if (selectedDept === editingDept) setSelectedDept(newDeptName)
        } catch (err) {
            alert('Bölüm Kayıt Hatası: ' + err.message)
        }
    }

    const handleDeleteDept = async (deptName) => {
        if (confirm(`${deptName} klasörünü silmek istediğinize emin misiniz?`)) {
            const { error } = await supabase.from('depts').delete().eq('name', deptName)
            if (error) alert(error.message)
            fetchData()
        }
    }

    const getDeptMembers = (dept) => members.filter(m => m.department === dept)

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Personel & Departman Yönetimi</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Bölüm klasörleri oluşturun ve personel kayıtlarını yönetin.</p>
                    </div>
                    {!selectedDept && (
                        <button className="btn btn-primary" onClick={() => {
                            setEditingDept(null)
                            setNewDeptName('')
                            setIsDeptModalOpen(true)
                        }}>
                            <FolderPlus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Bölüm Klasörü Ekle
                        </button>
                    )}
                </header>

                {!selectedDept ? (
                    <div className="project-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {departments.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '10rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                                <Folder size={48} className="text-primary" style={{ margin: '0 auto 1.5rem auto' }} />
                                <p style={{ color: 'var(--muted-foreground)' }}>Henüz bir bölüm oluşturulmadı.</p>
                                <button onClick={() => setIsDeptModalOpen(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>İlk Klasörü Ekle</button>
                            </div>
                        ) : (
                            departments.map(dept => (
                                <div
                                    key={dept}
                                    className="card folder-card"
                                    style={{ cursor: 'pointer', textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s', position: 'relative' }}
                                    onClick={() => setSelectedDept(dept)}
                                >
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingDept(dept)
                                                setNewDeptName(dept)
                                                setIsDeptModalOpen(true)
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteDept(dept)
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div style={{ color: '#3b82f6', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                        <Folder size={64} fill="rgba(59, 130, 246, 0.1)" />
                                    </div>
                                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{dept}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{getDeptMembers(dept).length} Personel</p>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <button onClick={() => setSelectedDept(null)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
                                <ArrowLeft size={16} /> Departmanlara Dön
                            </button>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className="btn"
                                    style={{ background: 'var(--secondary)', color: 'white' }}
                                    onClick={() => {
                                        setEditingDept(selectedDept)
                                        setNewDeptName(selectedDept)
                                        setIsDeptModalOpen(true)
                                    }}
                                >
                                    <Edit2 size={18} style={{ marginRight: '0.5rem' }} /> Klasörü Düzenle
                                </button>
                                <button className="btn btn-primary" onClick={() => setIsStaffModalOpen(true)}>
                                    <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Personel Kaydı Yap
                                </button>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem' }}>{selectedDept} / Personel Listesi</h3>

                        <div className="project-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                            {getDeptMembers(selectedDept).map(m => (
                                <div key={m.id} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>
                                                {m.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{m.full_name}</h4>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>{m.task_description}</span>
                                            </div>
                                        </div>
                                        {m.can_login && (
                                            <div style={{ padding: '0.4rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem' }}>
                                                <ShieldCheck size={20} />
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                            <Mail size={14} /> {m.email}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                            <Phone size={14} /> {m.phone || '-'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                            <Hash size={14} /> {m.extension || '-'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                            <Building size={14} /> {m.business_phone || '-'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {getDeptMembers(selectedDept).length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', color: 'var(--muted-foreground)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                                    Bu departmanda henüz kayıtlı personel bulunmuyor.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Dept Modal */}
                {isDeptModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                        <div className="card animate-fade-in" style={{ width: '400px', padding: '2.5rem', background: 'var(--card)' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>{editingDept ? 'Klasörü Düzenle' : 'Yeni Bölüm Klasörü Ekle'}</h3>
                            <form onSubmit={handleSaveDept}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Bölüm Adı</label>
                                    <input required autoFocus style={{ width: '100%', padding: '0.75rem' }} value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Örn: Mekanik Montaj" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button type="button" onClick={() => {
                                        setIsDeptModalOpen(false)
                                        setEditingDept(null)
                                    }} className="btn" style={{ background: 'var(--secondary)', color: 'white' }}>İptal</button>
                                    <button type="submit" className="btn btn-primary">{editingDept ? 'Güncelle' : 'Klasörü Oluştur'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Staff Modal */}
                {/* ... (Same staff modal code) ... */}
                {isStaffModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)' }}>
                        <div className="card animate-fade-in" style={{ width: '700px', maxWidth: '95vw', padding: '3rem', background: 'var(--card)', maxHeight: '95vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedDept} / Personel Kaydı</h3>
                                <button onClick={() => setIsStaffModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={handleRegister}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Ad Soyad</label>
                                        <input required style={{ width: '100%', padding: '0.75rem' }} value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Örn: Ahmet Yılmaz" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Kullanıcı Adı</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                required
                                                type="text"
                                                style={{ width: '100%', padding: '0.75rem 8.5rem 0.75rem 0.75rem' }}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value.split('@')[0].toLowerCase() })}
                                                placeholder="ad.soyad"
                                            />
                                            <span style={{
                                                position: 'absolute',
                                                right: '1rem',
                                                color: 'var(--muted-foreground)',
                                                fontSize: '0.85rem',
                                                pointerEvents: 'none',
                                                userSelect: 'none'
                                            }}>
                                                @repkon.com.tr
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Cep Telefonu</label>
                                        <input style={{ width: '100%', padding: '0.75rem' }} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Dahili Telefon</label>
                                        <input style={{ width: '100%', padding: '0.75rem' }} value={formData.extension} onChange={e => setFormData({ ...formData, extension: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>İş Telefonu</label>
                                        <input style={{ width: '100%', padding: '0.75rem' }} value={formData.business_phone} onChange={e => setFormData({ ...formData, business_phone: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Görev Tanımı</label>
                                        <input required style={{ width: '100%', padding: '0.75rem' }} value={formData.task_description} onChange={e => setFormData({ ...formData, task_description: e.target.value })} placeholder="Örn: CNC Operatörü" />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sistem Erişimi</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Bu personel sisteme girebilsin mi?</div>
                                            </div>
                                            <div
                                                onClick={() => setFormData({ ...formData, can_login: !formData.can_login })}
                                                style={{
                                                    width: '44px',
                                                    height: '24px',
                                                    borderRadius: '12px',
                                                    background: formData.can_login ? 'var(--primary)' : 'var(--secondary)',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: '0.3s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: formData.can_login ? '23px' : '3px',
                                                    transition: '0.3s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {formData.can_login && (
                                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Geçici Şifre</label>
                                                <input required={formData.can_login} type="text" style={{ width: '100%', padding: '0.75rem' }} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Yetki Rolü</label>
                                                <select required={formData.can_login} style={{ width: '100%', padding: '0.75rem' }} value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}>
                                                    <option value="">Rol Seçin</option>
                                                    {roles.filter(r => r.name !== 'Admin').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button type="button" onClick={() => setIsStaffModalOpen(false)} className="btn" style={{ background: 'var(--secondary)', color: 'white' }}>İptal</button>
                                    <button type="submit" className="btn btn-primary">Personeli Kaydet</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
