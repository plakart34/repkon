'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    ArrowLeft,
    Plus,
    Folder,
    FileText,
    Cpu,
    Settings,
    Layers,
    ClipboardList,
    ChevronRight,
    Package,
    Wrench,
    X,
    PlusCircle,
    Archive
} from 'lucide-react'

export default function MachineDetail() {
    const params = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()
    const [project, setProject] = useState(null)
    const [machine, setMachine] = useState(null)

    // States for custom folders
    const [customFolders, setCustomFolders] = useState([])
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            const { data: p } = await supabase.from('projects').select('*').eq('id', params.id).single()
            setProject(p)

            const { data: m } = await supabase.from('machines').select('*').eq('id', params.machineId).single()
            setMachine(m)

            // Load custom folders for this machine from localStorage for now
            const savedFolders = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(`rmk_custom_folders_${params.machineId}`) || '[]') : []
            setCustomFolders(savedFolders)
        }

        if (profile) {
            fetchData()
        }
    }, [profile, params.id, params.machineId])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const handleAddFolder = (e) => {
        e.preventDefault()
        if (!newFolderName.trim()) return

        // Create a slugified ID for the folder type
        const slug = newFolderName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        const folderId = `custom_${slug}_${Date.now()}`

        const newFolder = {
            id: folderId,
            name: newFolderName,
            type: folderId, // used as list type in storage
            icon: 'Folder'
        }

        const updatedFolders = [...customFolders, newFolder]
        setCustomFolders(updatedFolders)

        // Save to localStorage specifically for this machine
        if (typeof window !== 'undefined') {
            localStorage.setItem(`rmk_custom_folders_${params.machineId}`, JSON.stringify(updatedFolders))
        }

        setIsFolderModalOpen(false)
        setNewFolderName('')
    }

    const FolderCard = ({ title, description, icon: Icon, onClick, color = "var(--primary)" }) => (
        <div className="card animate-scale-in" onClick={onClick} style={{ cursor: 'pointer', transition: 'all 0.3s ease', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '300px', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <div style={{ background: `rgba(${color === 'var(--primary)' ? '59, 130, 246' : '168, 85, 247'}, 0.1)`, padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem', color: color }}>
                <Icon size={48} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>{title}</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>{description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontWeight: 700, fontSize: '1rem' }}>
                Klasörü Aç <ChevronRight size={18} />
            </div>
        </div>
    )

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '0.75rem', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '16px' }}>
                                <Cpu size={32} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2.25rem', fontWeight: 800 }}>{machine?.name}</h2>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '1rem' }}>Model: {machine?.model} | {machine?.serial_number}</p>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsFolderModalOpen(true)}>
                        <PlusCircle size={20} style={{ marginRight: '0.5rem' }} /> Yeni Klasör Ekle
                    </button>
                </header>

                <section className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                        <Layers size={24} className="text-primary" />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Üretim Yapısı (BOM)</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <FolderCard
                            title="eBOM"
                            description="Engineering Bill of Materials. Teknik tasarım listesi."
                            icon={Layers}
                            onClick={() => router.push(`/projects/${params.id}/machines/${params.machineId}/ebom`)}
                        />
                        <FolderCard
                            title="mBOM"
                            description="Manufacturing Bill of Materials. Üretim ve malzeme listesi."
                            icon={ClipboardList}
                            color="#a855f7"
                            onClick={() => router.push(`/projects/${params.id}/machines/${params.machineId}/mbom`)}
                        />
                        <FolderCard
                            title="Çalıştay Notları"
                            description={`${machine?.name} makinesine ait tüm iş emirleri, aksiyonlar ve montaj süreçleri.`}
                            icon={Wrench}
                            color="#ef4444"
                            onClick={() => router.push(`/projects/${params.id}/machines/${params.machineId}/workshop`)}
                        />

                        {/* Custom Folders */}
                        {customFolders.map(folder => (
                            <FolderCard
                                key={folder.id}
                                title={folder.name}
                                description={`${folder.name} içerisindeki döküman ve parça listeleri.`}
                                icon={Archive}
                                color="#f59e0b"
                                onClick={() => router.push(`/projects/${params.id}/machines/${params.machineId}/${folder.type}`)}
                            />
                        ))}
                    </div>
                </section>

                {/* New Folder Modal */}
                {isFolderModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                        <div className="card animate-fade-in" style={{ width: '450px', padding: '3rem', background: 'var(--card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Yeni Klasör Oluştur</h3>
                                <button onClick={() => setIsFolderModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={handleAddFolder}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Klasör Adı</label>
                                    <input
                                        required
                                        autoFocus
                                        style={{ width: '100%', padding: '1rem', background: 'var(--secondary)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                                        value={newFolderName}
                                        onChange={e => setNewFolderName(e.target.value)}
                                        placeholder="Örn: Teknik Çizimler, Kalite Belgeleri..."
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button type="button" onClick={() => setIsFolderModalOpen(false)} className="btn btn-secondary">Vazgeç</button>
                                    <button type="submit" className="btn btn-primary">Klasörü Oluştur</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
