'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Hammer,
    Play,
    Pause,
    CheckCircle2,
    Clock,
    ChevronRight,
    Cpu,
    Layers,
    History,
    Activity,
    Calendar,
    User,
    ShieldCheck,
    Building,
    X,
    MessageSquare,
    ArrowRight,
    Search,
    Filter,
    RotateCcw,
    LayoutDashboard,
    Timer,
    AlertCircle,
    Edit3,
    Trash2,
    MoreVertical,
    Check
} from 'lucide-react'

const getToday = () => {
    return new Date().toISOString().split('T')[0];
};

export default function WorkshopPage() {
    const { profile, loading: authLoading } = usePermissions()
    const [projects, setProjects] = useState([])
    const [selectedProjectId, setSelectedProjectId] = useState('')
    const [timelineData, setTimelineData] = useState([])
    const [loading, setLoading] = useState(true)

    const [machines, setMachines] = useState([])
    const [selectedMachineId, setSelectedMachineId] = useState('')
    const [bomItems, setBomItems] = useState([])
    const [selectedBomId, setSelectedBomId] = useState('')
    const [members, setMembers] = useState([])
    const [dynamicDepts, setDynamicDepts] = useState([])
    const [activeOpMenuId, setActiveOpMenuId] = useState(null)
    const [sortBy, setSortBy] = useState('order_id')
    const [sortOrder, setSortOrder] = useState('desc')

    const [operations, setOperations] = useState([])
    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deletingOpId, setDeletingOpId] = useState(null)

    const [selectedOp, setSelectedOp] = useState(null)
    const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' })

    const [filterSorumlu, setFilterSorumlu] = useState([])
    const [filterStatu, setFilterStatu] = useState([])
    const [filterProje, setFilterProje] = useState([])
    const [filterMakine, setFilterMakine] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

    const [logData, setLogData] = useState({
        process: '',
        targetDate: getToday(),
        responsibleDept: '',
        responsiblePersonId: '',
        notes: ''
    })

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: projData } = await supabase.from('projects').select('*')
            const { data: opData } = await supabase.from('operations').select('*').order('created_at', { ascending: false })
            const { data: profData } = await supabase.from('profiles').select('*')
            const { data: deptData } = await supabase.from('depts').select('*')

            setProjects(projData || [])
            setOperations(opData || [])
            setMembers(profData || [])
            setDynamicDepts((deptData || []).map(d => d.name).filter(n => n !== 'Yönetim'))
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleContextMenu = (e, opId) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const menuWidth = 220; const menuHeight = 280; const padding = 10;
        let x = e ? e.clientX : 0; let y = e ? e.clientY : 0;
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - padding;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - padding;
        setMenuPos({ x, y });
        setActiveOpMenuId(opId);
    };

    useEffect(() => {
        if (profile) fetchData()
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLogModalOpen(false); setIsStatusModalOpen(false);
                setIsTimelineModalOpen(false); setSelectedOp(null); setActiveOpMenuId(null);
            }
        }
        const handleOutsideClick = () => {
            setActiveOpMenuId(null);
            ['proje-dropdown', 'makine-dropdown', 'sorumlu-dropdown', 'status-dropdown'].forEach(id => {
                const dropdown = document.getElementById(id);
                if (dropdown) dropdown.style.display = 'none';
            });
        }
        window.addEventListener('click', handleOutsideClick)
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('click', handleOutsideClick)
        }
    }, [profile])

    useEffect(() => {
        const fetchMachines = async () => {
            if (selectedProjectId) {
                const { data } = await supabase.from('machines').select('*').eq('project_id', selectedProjectId)
                setMachines(data || [])
            } else {
                setMachines([])
            }
        }
        fetchMachines()
    }, [selectedProjectId])

    useEffect(() => {
        const fetchBomItems = async () => {
            if (selectedMachineId) {
                const { data } = await supabase.from('bom_items').select('*').eq('machine_id', selectedMachineId)
                setBomItems(data || [])
            } else {
                setBomItems([])
            }
        }
        fetchBomItems()
    }, [selectedMachineId])

    const filteredOperations = useMemo(() => {
        return operations.filter(op => {
            const matchSorumlu = filterSorumlu.length === 0 || filterSorumlu.includes(op.responsible_person)
            const matchStatu = filterStatu.length === 0 || filterStatu.includes(op.status)
            const matchProje = filterProje.length === 0 || filterProje.includes(op.project_name)
            const opMachineFull = `${op.machine_name} (${op.machine_model || '-'})`
            const matchMakine = filterMakine.length === 0 || filterMakine.includes(opMachineFull)

            const searchStr = `${op.order_id} ${op.project_name} ${op.machine_name} ${op.machine_model} ${op.responsible_person} ${op.responsible_dept} ${op.process} ${op.bom_code} ${op.bom_name}`.toLowerCase()
            const matchSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase())

            return matchSorumlu && matchStatu && matchProje && matchMakine && matchSearch
        })
    }, [operations, filterSorumlu, filterStatu, filterProje, filterMakine, searchTerm])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const handleSaveLog = async (e) => {
        e.preventDefault()
        const respPerson = members.find(m => m.id === logData.responsiblePersonId)
        const machine = machines.find(m => m.id === selectedMachineId)
        const project = projects.find(p => p.id === selectedProjectId)
        const bom = bomItems.find(b => b.id === selectedBomId)

        const opData = {
            project_id: selectedProjectId,
            project_name: project?.name,
            machine_id: selectedMachineId,
            machine_name: machine?.name,
            machine_model: machine?.model,
            bom_id: selectedBomId || null, // Ensure null if empty
            bom_code: bom?.code,
            bom_name: bom?.name,
            name: logData.process,
            process: logData.process,
            target_date: logData.targetDate,
            responsible_dept: logData.responsibleDept,
            responsible_person: respPerson?.full_name,
            responsible_person_id: logData.responsiblePersonId,
            status: 'Bekliyor',
            history: [{
                status: 'Başlatıldı',
                note: logData.process,
                timestamp: new Date().toISOString(),
                user: profile.full_name
            }],
            parent_id: logData.predecessorId || null // Ensure null if empty
        }

        let nextOrderId = '';
        if (!selectedOp) {
            const { count } = await supabase.from('operations').select('*', { count: 'exact', head: true })
            nextOrderId = `RMK-${1001 + (count || 0)}`
        }

        if (selectedOp) {
            const { error } = await supabase.from('operations').update(opData).eq('id', selectedOp.id)
            if (error) alert(error.message)
        } else {
            const { error: insertError } = await supabase.from('operations').insert({ ...opData, order_id: nextOrderId })

            if (insertError) {
                alert(insertError.message)
            } else {
                // SİSTEM LOGU EKLE (YENİ AKSİYON)
                await supabase.from('system_logs').insert([{
                    order_id: nextOrderId,
                    user_full_name: profile.full_name,
                    user_dept: profile.department,
                    action: 'Aksiyon Başlatıldı',
                    details: `${opData.project_name} - ${opData.machine_name} (${opData.machine_model}): ${opData.process}`,
                    project_name: opData.project_name,
                    machine_name: opData.machine_name,
                    created_at: new Date().toISOString()
                }])

                // YENİ AKSİYON BAŞLATILDIĞINDA BİLDİRİM GÖNDER
                if (logData.responsiblePersonId) {
                    await supabase
                        .from('notifications')
                        .insert([{
                            user_id: logData.responsiblePersonId,
                            title: 'Yeni İş Atandı 🔔',
                            message: `${project?.name || 'Proje'} - ${machine?.name || 'Makine'} üzerinde "${logData.process}" görevi size atandı.`,
                            type: 'task',
                            action_link: '/workshop',
                            created_at: new Date().toISOString()
                        }])
                }
            }
        }

        fetchData()
        setIsLogModalOpen(false)
        setSelectedOp(null)
        setLogData({ process: '', targetDate: getToday(), responsibleDept: '', responsiblePersonId: '', notes: '', predecessorId: '' })
    }

    const getSortedOperations = () => {
        return [...filteredOperations].sort((a, b) => {
            let valA = a[sortBy] || '';
            let valB = b[sortBy] || '';
            if (sortBy === 'target_date') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const sortedOperations = getSortedOperations();

    const getTargetDateStyle = (date, status) => {
        if (!date || status === 'Tamamlandı') return { color: 'var(--muted-foreground)', className: '' };
        const target = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0); target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { color: '#ef4444', className: 'animate-blink', fontWeight: 700 };
        if (diffDays <= 3) return { color: '#facc15', className: '', fontWeight: 700 };
        return { color: 'var(--foreground)', className: '' };
    };

    const handleDeleteClick = (id) => {
        setDeletingOpId(id);
        setIsDeleteModalOpen(true);
    }

    const confirmDelete = async () => {
        if (!deletingOpId) return;
        const opToDelete = operations.find(o => o.id === deletingOpId);

        const { error } = await supabase.from('operations').delete().eq('id', deletingOpId)
        if (error) {
            alert(error.message)
        } else {
            // SİSTEM LOGU EKLE (SİLME)
            await supabase.from('system_logs').insert([{
                order_id: opToDelete?.order_id,
                user_full_name: profile.full_name,
                user_dept: profile.department,
                action: 'Aksiyon Silindi',
                details: `${opToDelete?.project_name} - ${opToDelete?.machine_name}: "${opToDelete?.process}" aksiyonu silindi.`,
                project_name: opToDelete?.project_name,
                machine_name: opToDelete?.machine_name,
                created_at: new Date().toISOString()
            }])
        }

        setIsDeleteModalOpen(false);
        setDeletingOpId(null);
        fetchData()
    }

    const handleStatusChange = async (e) => {
        e.preventDefault()

        // 1. Öncül İş Kontrolü (Dependency Check)
        if ((statusUpdate.status === 'İşlemde' || statusUpdate.status === 'Tamamlandı') && selectedOp.parent_id) {
            const { data: parentOp } = await supabase
                .from('operations')
                .select('status, order_id, process')
                .eq('id', selectedOp.parent_id)
                .single()

            if (parentOp && parentOp.status !== 'Tamamlandı') {
                alert(`⚠️ Bu işleme başlayamazsınız!\n\nÖncül işlem ("${parentOp.order_id} - ${parentOp.process}") henüz tamamlanmadı.\nStatü: ${parentOp.status}`)
                return;
            }
        }

        const newHistory = [...(selectedOp.history || []), {
            status: statusUpdate.status,
            note: statusUpdate.note,
            timestamp: new Date().toISOString(),
            user: profile.full_name
        }]

        const { error } = await supabase.from('operations').update({
            status: statusUpdate.status,
            history: newHistory
        }).eq('id', selectedOp.id)

        if (error) {
            alert(error.message)
        } else {
            // 2. Ardıl İşler İçin Bildirim Gönder (Successor Notification)
            if (statusUpdate.status === 'Tamamlandı') {
                const { data: children } = await supabase
                    .from('operations')
                    .select('*')
                    .eq('parent_id', selectedOp.id)

                if (children && children.length > 0) {
                    const notifications = children.map(child => ({
                        user_id: child.responsible_person_id,
                        title: 'Öncül İş Tamamlandı 🚀',
                        message: `"${selectedOp.order_id} - ${selectedOp.process}" tamamlandı. Artık "${child.process}" görevine başlayabilirsiniz.`,
                        type: 'dependency',
                        action_link: '/workshop',
                        created_at: new Date().toISOString()
                    }))
                    await supabase.from('notifications').insert(notifications)
                }
            }
        }

        fetchData()
        setIsStatusModalOpen(false)
        setStatusUpdate({ status: '', note: '' })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Bekliyor': return { bg: 'rgba(250, 204, 21, 0.1)', text: '#facc15' }
            case 'İşlemde': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' }
            case 'Tamamlandı': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80' }
            case 'Durduruldu': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }
            default: return { bg: 'rgba(255, 255, 255, 0.05)', text: 'white' }
        }
    }

    const stats = {
        total: operations.length,
        active: operations.filter(o => o.status === 'İşlemde').length,
        pending: operations.filter(o => o.status === 'Bekliyor').length,
        completed: operations.filter(o => o.status === 'Tamamlandı').length
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <div style={{
                    position: 'sticky',
                    top: '1.5rem',
                    zIndex: 1100,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    pointerEvents: 'none',
                    marginBottom: '-3.5rem' // Header yüksekliği kadar negatif margin ile header üzerine bindir
                }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsLogModalOpen(true)}
                        style={{
                            pointerEvents: 'auto',
                            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <Play size={18} fill="currentColor" style={{ marginRight: '0.5rem' }} /> Yeni Aksiyon Başlat
                    </button>
                </div>

                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Çalıştay & İmalat Takibi</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Aksiyon süreçlerini özetleyin ve yönetin.</p>
                    </div>
                </header>

                {/* Top Summary Stats */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#3b82f6' }}>
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>TOPLAM AKSİYON</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ background: 'rgba(250, 204, 21, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#facc15' }}>
                            <Timer size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>BEKLEYEN İŞLER</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.pending}</div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#3b82f6' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>İŞLEMDE OLANLAR</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.active}</div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#4ade80' }}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>TAMAMLANANLAR</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.completed}</div>
                        </div>
                    </div>
                </section>

                {/* Filters Section */}
                <section className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--card)', overflow: 'visible', position: 'relative', zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={18} className="text-primary" />
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Filtrele</h4>
                        </div>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                            <input
                                type="text"
                                placeholder="Tabloda ara..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.7rem 1rem 0.7rem 3rem',
                                    background: 'var(--secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    color: 'var(--foreground)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'end' }}>
                        {[
                            { id: 'proje-dropdown', label: 'Proje', value: filterProje, setter: setFilterProje, options: Array.from(new Set(operations.map(o => o.project_name))), placeholder: 'Tüm Projeler' },
                            { id: 'makine-dropdown', label: 'Makine (Model)', value: filterMakine, setter: setFilterMakine, options: Array.from(new Set(operations.map(o => `${o.machine_name} (${o.machine_model || '-'})`))), placeholder: 'Tüm Makineler' },
                            { id: 'sorumlu-dropdown', label: 'Sorumlu', value: filterSorumlu, setter: setFilterSorumlu, options: Array.from(new Set(operations.map(o => o.responsible_person))), placeholder: 'Tüm Personeller' },
                        ].map((filter) => (
                            <div key={filter.id}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filter.label}</label>
                                <div style={{ position: 'relative' }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            background: 'var(--secondary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            padding: '0.7rem 1rem',
                                            color: filter.value.length > 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            minHeight: '44px',
                                            border: filter.value.length > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            transition: '0.2s'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const dropdown = document.getElementById(filter.id);
                                            // Close other dropdowns first
                                            ['proje-dropdown', 'makine-dropdown', 'sorumlu-dropdown', 'status-dropdown'].forEach(id => {
                                                if (id !== filter.id) {
                                                    const other = document.getElementById(id);
                                                    if (other) other.style.display = 'none';
                                                }
                                            });
                                            if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                                        }}
                                    >
                                        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {filter.value.length > 0 ? `${filter.value.length} ${filter.label} Seçildi` : filter.placeholder}
                                        </span>
                                        <ChevronRight size={14} style={{ transform: 'rotate(90deg)', flexShrink: 0 }} />
                                    </div>
                                    <div
                                        id={filter.id}
                                        style={{
                                            position: 'absolute',
                                            top: '115%',
                                            left: 0,
                                            right: 0,
                                            background: '#18181b',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '0.5rem',
                                            zIndex: 2000,
                                            boxShadow: '0 20px 50px rgba(0,0,0,1)',
                                            display: 'none',
                                            maxHeight: '280px',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        {filter.options.map(opt => {
                                            const isSelected = filter.value.includes(opt);
                                            return (
                                                <div
                                                    key={opt}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isSelected) {
                                                            filter.setter(prev => prev.filter(s => s !== opt));
                                                        } else {
                                                            filter.setter(prev => [...prev, opt]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0.6rem 0.75rem',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                        color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                                                        fontSize: '0.85rem',
                                                        transition: '0.2s',
                                                        marginBottom: '2px'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        border: '2px solid',
                                                        borderColor: isSelected ? 'var(--primary)' : 'var(--muted-foreground)',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: isSelected ? 'var(--primary)' : 'transparent',
                                                        flexShrink: 0
                                                    }}>
                                                        {isSelected && <Check size={12} color="white" />}
                                                    </div>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt}</span>
                                                </div>
                                            )
                                        })}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                filter.setter([]);
                                            }}
                                            style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.75rem', color: '#ef4444', cursor: 'pointer', textAlign: 'center' }}
                                        >
                                            {filter.label} Filtresini Temizle
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Statü Filtresi (Döngü Dışında - Aynı Tasarım) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statü</label>
                            <div style={{ position: 'relative' }}>
                                <div
                                    style={{
                                        width: '100%',
                                        background: 'var(--secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '0.7rem 1rem',
                                        color: filterStatu.length > 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        minHeight: '44px',
                                        border: filterStatu.length > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        transition: '0.2s'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const dropdown = document.getElementById('status-dropdown');
                                        // Close other dropdowns
                                        ['proje-dropdown', 'makine-dropdown', 'sorumlu-dropdown', 'status-dropdown'].forEach(id => {
                                            if (id !== 'status-dropdown') {
                                                const other = document.getElementById(id);
                                                if (other) other.style.display = 'none';
                                            }
                                        });
                                        if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                                    }}
                                >
                                    <span style={{ fontSize: '0.85rem' }}>{filterStatu.length > 0 ? `${filterStatu.length} Statü Seçildi` : 'Tüm Statüler'}</span>
                                    <ChevronRight size={14} style={{ transform: 'rotate(90deg)', flexShrink: 0 }} />
                                </div>
                                <div
                                    id="status-dropdown"
                                    style={{
                                        position: 'absolute',
                                        top: '115%',
                                        left: 0,
                                        right: 0,
                                        background: '#18181b',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '0.5rem',
                                        zIndex: 2000,
                                        boxShadow: '0 20px 50px rgba(0,0,0,1)',
                                        display: 'none',
                                        maxHeight: '280px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    {['Bekliyor', 'İşlemde', 'Tamamlandı', 'Durduruldu'].map(status => {
                                        const isSelected = filterStatu.includes(status);
                                        return (
                                            <div
                                                key={status}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelected) {
                                                        setFilterStatu(prev => prev.filter(s => s !== status));
                                                    } else {
                                                        setFilterStatu(prev => [...prev, status]);
                                                    }
                                                }}
                                                style={{
                                                    padding: '0.6rem 0.75rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                    color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                                                    fontSize: '0.85rem',
                                                    transition: '0.2s',
                                                    marginBottom: '2px'
                                                }}
                                            >
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    border: '2px solid',
                                                    borderColor: isSelected ? 'var(--primary)' : 'var(--muted-foreground)',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                                    flexShrink: 0
                                                }}>
                                                    {isSelected && <Check size={12} color="white" />}
                                                </div>
                                                {status}
                                            </div>
                                        )
                                    })}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFilterStatu([]);
                                        }}
                                        style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.75rem', color: '#ef4444', cursor: 'pointer', textAlign: 'center' }}
                                    >
                                        Statü Filtresini Temizle
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => { setFilterProje([]); setFilterMakine([]); setFilterSorumlu([]); setFilterStatu([]); setSearchTerm(''); }}
                            className="btn"
                            style={{
                                padding: '0.7rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--secondary)',
                                color: 'var(--foreground)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                                e.currentTarget.style.borderColor = 'var(--primary)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                            }}
                        >
                            <RotateCcw size={14} /> Temizle
                        </button>
                    </div>
                </section>

                <section style={{ maxWidth: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <History size={20} className="text-primary" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Aksiyon Listesi</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>({filteredOperations.length} sonuç listeleniyor)</span>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'visible', position: 'relative' }}>
                        {filteredOperations.length === 0 ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                {operations.length > 0 ? 'Filtrelere uygun aksiyon bulunamadı.' : 'Henüz bir aksiyon bulunmuyor.'}
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                        {[
                                            { label: 'No / Statü', key: 'order_id', width: '100px' },
                                            { label: 'Proje', key: 'project_name' },
                                            { label: 'Makine', key: 'machine_name' },
                                            { label: 'BOM / Parça', key: 'bom_code' },
                                            { label: 'Yapılan İşlem', key: 'process' },
                                            { label: 'Sorumlu Bölüm', key: 'responsible_dept' },
                                            { label: 'Sorumlu Kişi', key: 'responsible_person' },
                                            { label: 'Hedef Tarih', key: 'target_date' }
                                        ].map(col => (
                                            <th
                                                key={col.key}
                                                style={{ padding: '0.75rem', fontSize: '0.9rem', width: col.width, cursor: 'pointer', transition: 'all 0.2s' }}
                                                onClick={() => handleSort(col.key)}
                                                className="nav-item-mini"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {col.label}
                                                    {sortBy === col.key && (
                                                        <span style={{ color: 'var(--primary)' }}>
                                                            {sortOrder === 'asc' ? '↑' : '↓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{ padding: '0.75rem', fontSize: '0.9rem', textAlign: 'right', width: '50px' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedOperations.map(op => (
                                        <tr
                                            key={op.id}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'context-menu',
                                                transition: 'all 0.2s ease',
                                                backgroundColor: activeOpMenuId === op.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                                boxShadow: activeOpMenuId === op.id ? 'inset 4px 0 0 var(--primary)' : 'none'
                                            }}
                                            onContextMenu={(e) => handleContextMenu(e, op.id)}
                                            className="nav-item-mini"
                                        >
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{op.order_id}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <span className="status-badge" style={{ background: getStatusColor(op.status).bg, color: getStatusColor(op.status).text, fontSize: '0.75rem', padding: '0.1rem 0.4rem', width: 'fit-content' }}>{op.status}</span>
                                                    {op.parent_id && (() => {
                                                        const parent = operations.find(o => o.id === op.parent_id);
                                                        if (!parent) return null;
                                                        return (
                                                            <div style={{
                                                                fontSize: '0.65rem',
                                                                color: parent.status === 'Tamamlandı' ? '#4ade80' : '#f87171',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                <span style={{ opacity: 0.6 }}>Öncül:</span> {parent.order_id}
                                                                <span style={{ fontWeight: 700, fontStyle: 'italic' }}>({parent.status})</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{op.project_name}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div>{op.machine_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{op.machine_model}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 500 }}>{op.bom_code || '-'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{op.bom_name}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div style={{ color: 'var(--foreground)' }}>{op.process}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{op.responsible_dept}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{op.responsible_person}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div
                                                    className={getTargetDateStyle(op.target_date, op.status).className}
                                                    style={{
                                                        color: getTargetDateStyle(op.target_date, op.status).color,
                                                        fontWeight: getTargetDateStyle(op.target_date, op.status).fontWeight || 400
                                                    }}
                                                >
                                                    {op.target_date ? new Date(op.target_date).toLocaleDateString('tr-TR') : '-'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            handleContextMenu({
                                                                clientX: rect.left - 180,
                                                                clientY: rect.bottom + 5,
                                                                preventDefault: () => { },
                                                                stopPropagation: () => { }
                                                            }, op.id);
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.4rem' }}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </main>

            {/* Modals */}
            {isLogModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '95vw', padding: '3rem', background: 'var(--card)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedOp ? 'Aksiyonu Düzenle' : 'Yeni Aksiyon Başlat'}</h3>
                            <button onClick={() => { setIsLogModalOpen(false); setSelectedOp(null); setLogData({ process: '', targetDate: getToday(), responsibleDept: '', responsiblePersonId: '', notes: '', predecessorId: '' }); }} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                <X size={28} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLog}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Proje</label>
                                    <select required style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                                        <option value="">Proje Seçin</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Makine</label>
                                    <select disabled={!selectedProjectId} required style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
                                        <option value="">Makine Seçin</option>
                                        {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>BOM / Parça</label>
                                <select disabled={!selectedMachineId} style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={selectedBomId} onChange={e => setSelectedBomId(e.target.value)}>
                                    <option value="">Parça Seçin (Opsiyonel)</option>
                                    {bomItems.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name} ({b.listType})</option>)}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Yapılan İşlem / Operasyon</label>
                                <input required style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={logData.process} onChange={e => setLogData({ ...logData, process: e.target.value })} placeholder="Örn: Mekanik montaj aşaması başladı" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Sorumlu Bölüm</label>
                                    <select
                                        required
                                        style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                        value={logData.responsibleDept}
                                        onChange={e => setLogData({ ...logData, responsibleDept: e.target.value, responsiblePersonId: '' })}
                                    >
                                        <option value="">Bölüm Seçin</option>
                                        {dynamicDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Sorumlu Kişi</label>
                                    <select
                                        required
                                        disabled={!logData.responsibleDept}
                                        style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', opacity: logData.responsibleDept ? 1 : 0.5 }}
                                        value={logData.responsiblePersonId}
                                        onChange={e => setLogData({ ...logData, responsiblePersonId: e.target.value })}
                                    >
                                        <option value="">Kişi Seçin</option>
                                        {members
                                            .filter(m => m.department === logData.responsibleDept)
                                            .map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)
                                        }
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Hedef Tamamlanma Tarihi</label>
                                <input type="date" required style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={logData.targetDate} onChange={e => setLogData({ ...logData, targetDate: e.target.value })} />
                            </div>

                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Öncül Aksiyon (Bağımlılık)</label>
                                <select
                                    style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}
                                    value={logData.predecessorId}
                                    onChange={e => setLogData({ ...logData, predecessorId: e.target.value })}
                                >
                                    <option value="">Seçilmedi (Bağımsız)</option>
                                    {operations
                                        .filter(o => !selectedOp || o.id !== selectedOp.id)
                                        .sort((a, b) => (a.order_id > b.order_id ? -1 : 1))
                                        .map(o => (
                                            <option key={o.id} value={o.id} style={{ background: 'var(--card)' }}>
                                                {o.order_id} - {o.process.substring(0, 40)}... ({o.status})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button" onClick={() => { setIsLogModalOpen(false); setSelectedOp(null); }} className="btn" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>İptal</button>
                                <button type="submit" className="btn btn-primary">{selectedOp ? 'Güncelle' : 'Aksiyonu Başlat'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isStatusModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '450px', padding: '2.5rem', background: 'var(--card)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>{selectedOp?.order_id} / Statü Güncelle</h3>
                        <form onSubmit={handleStatusChange}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Yeni Statü</label>
                                <select required style={{ width: '100%', padding: '0.75rem' }} value={statusUpdate.status} onChange={e => setStatusUpdate({ ...statusUpdate, status: e.target.value })}>
                                    <option value="Bekliyor">Bekliyor</option>
                                    <option value="İşlemde">İşlemde</option>
                                    <option value="Tamamlandı">Tamamlandı</option>
                                    <option value="Durduruldu">Durduruldu</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Açıklama / Not (Opsiyonel)</label>
                                <textarea
                                    style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', minHeight: '100px', color: 'white' }}
                                    value={statusUpdate.note}
                                    onChange={e => setStatusUpdate({ ...statusUpdate, note: e.target.value })}
                                    placeholder="Neden statü değiştirildi?"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="btn" style={{ background: 'var(--secondary)' }}>Vazgeç</button>
                                <button type="submit" className="btn btn-primary">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isTimelineModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)' }}>
                    <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '95vw', padding: '3rem', background: 'var(--card)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedOp?.order_id} / Süreç Takibi</h3>
                                <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>{selectedOp?.process}</p>
                            </div>
                            <button onClick={() => setIsTimelineModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                <X size={28} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
                            {(selectedOp?.history || []).slice().reverse().map((h, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getStatusColor(h.status).text, zIndex: 2 }} />
                                        {i !== (selectedOp?.history || []).length - 1 && (
                                            <div style={{ width: '2px', flex: 1, background: 'var(--border)', margin: '4px 0' }} />
                                        )}
                                    </div>
                                    <div style={{ paddingBottom: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: getStatusColor(h.status).text, textTransform: 'uppercase' }}>{h.status}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{new Date(h.timestamp).toLocaleString('tr-TR')}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'white', marginBottom: '0.4rem' }}>{h.note}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <User size={12} /> {h.user}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {/* Global Context Menu */}
            {activeOpMenuId && operations.find(o => o.id === activeOpMenuId) && typeof document !== 'undefined' && createPortal(
                <div
                    className="card animate-fade-in"
                    style={{
                        position: 'fixed',
                        left: `${menuPos.x}px`,
                        top: `${menuPos.y}px`,
                        zIndex: 999999,
                        minWidth: '220px',
                        padding: '0.6rem',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-xl)',
                        borderRadius: '16px',
                        textAlign: 'left',
                        backdropFilter: 'blur(10px)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(() => {
                        const op = operations.find(o => o.id === activeOpMenuId);
                        const itemStyle = {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.7rem',
                            width: '100%',
                            padding: '0.75rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            borderRadius: '10px',
                            transition: 'all 0.2s ease'
                        }
                        return (
                            <>
                                <div style={{ padding: '0.6rem 0.6rem 0.4rem 0.6rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.1rem' }}>{op.order_id}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.project_name}</div>
                                </div>
                                <button
                                    onClick={() => { setSelectedOp(op); setStatusUpdate({ status: op.status, note: '' }); setIsStatusModalOpen(true); setActiveOpMenuId(null); }}
                                    style={{ ...itemStyle }}
                                    className="nav-item-mini"
                                >
                                    <Play size={14} color="var(--primary)" /> Statü Güncelle
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedOp(op);
                                        setActiveOpMenuId(null);
                                        setSelectedProjectId(op.project_id);
                                        setSelectedMachineId(op.machine_id);
                                        setSelectedBomId(op.bom_id);
                                        setLogData({
                                            process: op.process,
                                            targetDate: op.target_date || getToday(),
                                            responsibleDept: op.responsible_dept,
                                            responsiblePersonId: op.responsible_person_id,
                                            notes: op.notes || '',
                                            predecessorId: op.parent_id || ''
                                        });
                                        setIsLogModalOpen(true);
                                    }}
                                    style={{ ...itemStyle }}
                                    className="nav-item-mini"
                                >
                                    <Edit3 size={14} color="var(--primary)" /> Düzenle
                                </button>
                                <button
                                    onClick={() => { setSelectedOp(op); setIsTimelineModalOpen(true); setActiveOpMenuId(null); }}
                                    style={{ ...itemStyle }}
                                    className="nav-item-mini"
                                >
                                    <Activity size={14} color="var(--primary)" /> Süreç Geçmişi
                                </button>
                                <div style={{ height: '1px', background: 'var(--border)', margin: '0.3rem 0' }} />
                                <button
                                    onClick={() => { handleDeleteClick(op.id); setActiveOpMenuId(null); }}
                                    style={{ ...itemStyle, color: '#ef4444' }}
                                    className="nav-item-mini"
                                >
                                    <Trash2 size={14} /> Sil
                                </button>
                            </>
                        );
                    })()}
                </div>,
                document.body
            )}

            {isDeleteModalOpen && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '400px', padding: '2.5rem', background: 'var(--card)', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                            <Trash2 size={30} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Emin misiniz?</h3>
                        <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Bu aksiyonu (<strong>{operations.find(o => o.id === deletingOpId)?.order_id}</strong>) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => { setIsDeleteModalOpen(false); setDeletingOpId(null); }} className="btn" style={{ background: 'var(--secondary)' }}>Vazgeç</button>
                            <button onClick={confirmDelete} className="btn" style={{ background: '#ef4444', color: 'white' }}>Evet, Sil</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
