'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import { createPortal } from 'react-dom'
import {
    Calendar as CalendarIcon,
    Users,
    CheckCircle2,
    Clock,
    Play,
    Timer,
    Activity,
    AlertCircle,
    UserCircle,
    Building,
    Folder,
    LayoutGrid,
    CalendarDays,
    MoreVertical,
    X,
    User,
    ChevronRight,
    RotateCcw,
    Edit3,
    Trash2,
    History
} from 'lucide-react'

const getToday = () => {
    return new Date().toISOString().split('T')[0];
};

export default function Tasks() {
    const { profile, loading: authLoading } = usePermissions()
    const [operations, setOperations] = useState([])
    const [departments, setDepartments] = useState([])
    const [activeDept, setActiveDept] = useState('')
    const [viewType, setViewType] = useState('kanban') // 'kanban' veya 'calendar'

    const [projects, setProjects] = useState([])
    const [selectedProjectId, setSelectedProjectId] = useState('')
    const [machines, setMachines] = useState([])
    const [selectedMachineId, setSelectedMachineId] = useState('')
    const [bomItems, setBomItems] = useState([])
    const [selectedBomId, setSelectedBomId] = useState('')
    const [members, setMembers] = useState([])
    const [dynamicDepts, setDynamicDepts] = useState([])

    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false)
    const [selectedOp, setSelectedOp] = useState(null)
    const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' })
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
    const [activeOpMenuId, setActiveOpMenuId] = useState(null)

    const [logData, setLogData] = useState({
        process: '',
        targetDate: getToday(),
        responsibleDept: '',
        responsiblePersonId: '',
        notes: '',
        predecessorId: ''
    })

    const [draggedOp, setDraggedOp] = useState(null)

    const fetchData = async () => {
        try {
            if (!profile) return
            const { data: projData } = await supabase.from('projects').select('*')
            const { data: opData } = await supabase.from('operations').select('*').order('created_at', { ascending: false })
            const { data: profData } = await supabase.from('profiles').select('*')
            const { data: deptData } = await supabase.from('depts').select('*')

            setProjects(projData || [])
            setMembers(profData || [])
            setDynamicDepts((deptData || []).map(d => d.name).filter(n => n !== 'Yönetim'))

            const allOps = opData || []
            const activeOps = allOps.filter(op => op.status !== 'Tamamlandı' && op.status !== 'Durduruldu')
            setOperations(activeOps)
            setAllOperationsRaw(allOps) // We need all for predecessor labels

            const depts = [...new Set(activeOps.map(op => op.responsible_dept).filter(Boolean))]
            setDepartments(depts)
            if (depts.length > 0 && !activeDept) {
                setActiveDept(depts[0])
            }
        } catch (err) {
            console.error('Fetch error:', err)
        }
    }

    const [allOperationsRaw, setAllOperationsRaw] = useState([])

    useEffect(() => {
        if (profile) fetchData()
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLogModalOpen(false); setIsStatusModalOpen(false);
                setIsTimelineModalOpen(false); setSelectedOp(null); setActiveOpMenuId(null);
            }
        }
        const handleOutsideClick = () => setActiveOpMenuId(null)
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
            bom_id: selectedBomId,
            bom_code: bom?.code,
            bom_name: bom?.name,
            name: logData.process,
            process: logData.process,
            target_date: logData.targetDate,
            responsible_dept: logData.responsibleDept,
            responsible_person: respPerson?.full_name,
            responsible_person_id: logData.responsiblePersonId,
            status: selectedOp ? selectedOp.status : 'Bekliyor',
            parent_id: logData.predecessorId || null
        }

        if (selectedOp) {
            const { error } = await supabase.from('operations').update(opData).eq('id', selectedOp.id)
            if (error) alert(error.message)
        } else {
            const { count } = await supabase.from('operations').select('*', { count: 'exact', head: true })
            const nextId = `RMK-${1001 + (count || 0)}`
            const { error } = await supabase.from('operations').insert({ ...opData, order_id: nextId, history: [{ status: 'Başlatıldı', note: logData.process, timestamp: new Date().toISOString(), user: profile.full_name }] })
            if (error) alert(error.message)
        }

        fetchData()
        setIsLogModalOpen(false)
        setSelectedOp(null)
        setLogData({ process: '', targetDate: getToday(), responsibleDept: '', responsiblePersonId: '', notes: '', predecessorId: '' })
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
                        action_link: '/tasks',
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

    const handleDelete = async (id) => {
        if (window.confirm('Bu aksiyonu silmek istediğinize emin misiniz?')) {
            const { error } = await supabase.from('operations').delete().eq('id', id)
            if (error) alert(error.message)
            fetchData()
        }
    }

    const handleDragStart = (e, op) => {
        setDraggedOp(op)
        e.dataTransfer.setData('opId', op.id)
        e.currentTarget.style.opacity = '0.4'
    }

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1'
    }

    const handleDrop = async (e, targetPersonName) => {
        e.preventDefault()
        if (!draggedOp) return

        // Atanmamış sütununa sürüklenirse atamayı kaldır
        if (targetPersonName === 'Atanmamış') {
            const { error } = await supabase.from('operations').update({
                responsible_person: null,
                responsible_person_id: null
            }).eq('id', draggedOp.id)

            if (!error) fetchData()
            setDraggedOp(null)
            return
        }

        const targetMember = members.find(m => m.full_name === targetPersonName)
        if (!targetMember) return

        if (draggedOp.responsible_person_id === targetMember.id) {
            setDraggedOp(null)
            return
        }

        const { error } = await supabase.from('operations').update({
            responsible_person: targetMember.full_name,
            responsible_person_id: targetMember.id,
            responsible_dept: targetMember.department // Departmanı da güncelle (farklı departmandaki birine atamış olabiliriz)
        }).eq('id', draggedOp.id)

        if (error) {
            console.error('Update failure:', error)
            alert('Atama güncellenemedi: ' + error.message)
        } else {
            fetchData()
        }
        setDraggedOp(null)
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

    const groupedData = useMemo(() => {
        if (!activeDept) return {}

        const deptOps = operations.filter(op => op.responsible_dept === activeDept)
        const grouped = deptOps.reduce((acc, op) => {
            const person = op.responsible_person || 'Atanmamış'
            if (!acc[person]) acc[person] = []
            acc[person].push(op)
            return acc
        }, {})

        Object.keys(grouped).forEach(person => {
            grouped[person].sort((a, b) => {
                if (!a.target_date) return 1
                if (!b.target_date) return -1
                return new Date(a.target_date) - new Date(b.target_date)
            })
        })

        return grouped
    }, [operations, activeDept])

    // Takvim verileri
    const calendarDates = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return Array.from({ length: 15 }).map((_, i) => {
            const d = new Date(today)
            d.setDate(d.getDate() + i)
            return d
        })
    }, [])

    const getTargetDateStyle = (date) => {
        if (!date) return { color: 'var(--muted-foreground)', text: 'Tarih Yok', icon: <Clock size={12} /> }
        const target = new Date(date)
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        target.setHours(0, 0, 0, 0)

        const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return { color: '#ef4444', text: `Gecikti (${Math.abs(diffDays)} G)`, icon: <AlertCircle size={12} /> }
        if (diffDays === 0) return { color: '#facc15', text: 'Bugün', icon: <Timer size={12} /> }
        if (diffDays <= 3) return { color: '#facc15', text: `${diffDays} gün kaldı`, icon: <Timer size={12} /> }
        return { color: '#4ade80', text: `${diffDays} gün kaldı`, icon: <CalendarIcon size={12} /> }
    }

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    // Takvim hücresi render fonksiyonu
    const renderCalendarCell = (ops, cellDate, isOverdue = false, isNoDate = false) => {
        const cellOps = ops.filter(op => {
            if (isNoDate) return !op.target_date
            if (!op.target_date) return false

            const target = new Date(op.target_date)
            target.setHours(0, 0, 0, 0)

            if (isOverdue) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return target < today
            }

            return target.getTime() === cellDate.getTime()
        })

        return (
            <div style={{ padding: '0.5rem', minHeight: '120px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                {cellOps.map(op => {
                    const ds = getTargetDateStyle(op.target_date)
                    return (
                        <div key={op.id} style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${op.status === 'İşlemde' ? '#3b82f6' : '#facc15'}`, borderRadius: '6px', fontSize: '0.75rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>{op.order_id}</div>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>{op.process}</div>
                            <div style={{ color: ds.color, display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>{ds.icon} {op.status}</div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in" style={{ minWidth: 0 }}>
                <header className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Building size={32} color="var(--primary)" /> Ekip İş Takibi <span style={{ fontSize: '1rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>(Aktif Görevler)</span>
                        </h2>
                        <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>Ekiplerin ve personelin sorumluluğundaki güncel çalıştay aksiyonları.</p>
                    </div>

                    <div style={{ display: 'flex', background: 'var(--secondary)', padding: '0.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setViewType('kanban')}
                            style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: 'none', background: viewType === 'kanban' ? 'var(--primary)' : 'transparent', color: viewType === 'kanban' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <LayoutGrid size={16} /> Kanban
                        </button>
                        <button
                            onClick={() => setViewType('calendar')}
                            style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: 'none', background: viewType === 'calendar' ? 'var(--primary)' : 'transparent', color: viewType === 'calendar' ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <CalendarDays size={16} /> Personel Takvimi
                        </button>
                    </div>
                </header>

                {/* Department Tabs */}
                {departments.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {departments.map(dept => (
                            <button
                                key={dept}
                                onClick={() => setActiveDept(dept)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '50px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    background: activeDept === dept ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeDept === dept ? 'white' : 'var(--muted-foreground)',
                                    border: `1px solid ${activeDept === dept ? 'var(--primary)' : 'transparent'}`,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        Şu anda hiçbir ekipte aktif/bekleyen bir görev bulunmamaktadır.
                    </div>
                )}

                {activeDept && viewType === 'kanban' && (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '2rem' }}>
                        {Object.entries(groupedData).map(([person, ops]) => (
                            <div
                                key={person}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                }}
                                onDrop={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                    handleDrop(e, person)
                                }}
                                style={{ minWidth: '350px', maxWidth: '350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '75vh', transition: 'all 0.2s' }}
                            >
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'var(--primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{person.charAt(0)}</div>
                                        <div>
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{person}</h3>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{ops.length} aktif görev</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {ops.map(op => {
                                        const dateStyle = getTargetDateStyle(op.target_date)
                                        return (
                                            <div
                                                key={op.id}
                                                className="card"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, op)}
                                                onDragEnd={handleDragEnd}
                                                style={{ padding: '1rem', background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `4px solid ${op.status === 'İşlemde' ? '#3b82f6' : '#facc15'}`, position: 'relative', cursor: 'grab' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>{op.order_id}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: dateStyle.color, fontWeight: 700, background: `${dateStyle.color}15`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                            {dateStyle.icon} {dateStyle.text}
                                                        </div>
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
                                                            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{op.process}</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Folder size={12} /> <span style={{ color: 'white' }}>{op.project_name}</span></div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={12} /> <span>{op.machine_name}</span></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeDept && viewType === 'calendar' && (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '1rem', width: '200px', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 10, borderRight: '1px solid var(--border)' }}>Personel</th>
                                    <th style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid var(--border)' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem' }}>Gecikmiş İşler</div>
                                    </th>
                                    <th style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.85rem' }}>Tarihsiz</div>
                                    </th>
                                    {calendarDates.map((date, idx) => (
                                        <th key={idx} style={{ padding: '1rem', minWidth: '150px', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: idx === 0 ? '#3b82f6' : 'white' }}>{date.getDate()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{date.toLocaleDateString('tr-TR', { month: 'short' })}</span></div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groupedData).map(([person, ops]) => (
                                    <tr key={person} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 10, borderRight: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{person}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{ops.length} Görev</div>
                                        </td>
                                        <td style={{ verticalAlign: 'top', padding: 0 }}>
                                            {renderCalendarCell(ops, null, true, false)}
                                        </td>
                                        <td style={{ verticalAlign: 'top', padding: 0 }}>
                                            {renderCalendarCell(ops, null, false, true)}
                                        </td>
                                        {calendarDates.map((date, idx) => (
                                            <td key={idx} style={{ verticalAlign: 'top', padding: 0 }}>
                                                {renderCalendarCell(ops, date)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

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
                                    <History size={14} color="var(--primary)" /> Süreç Geçmişi
                                </button>
                                <div style={{ height: '1px', background: 'var(--border)', margin: '0.4rem 0' }} />
                                <button
                                    onClick={() => { handleDelete(op.id); setActiveOpMenuId(null); }}
                                    style={{ ...itemStyle, color: '#ef4444' }}
                                    className="nav-item-mini"
                                >
                                    <Trash2 size={14} /> Sil
                                </button>
                            </>
                        )
                    })()}
                </div>,
                document.body
            )}

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
                                    {allOperationsRaw
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
                                            <UserCircle size={12} /> {h.user}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
