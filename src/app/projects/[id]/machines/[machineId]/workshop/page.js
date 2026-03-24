'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { storage } from '@/lib/storage'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    ArrowLeft,
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
    MoreVertical
} from 'lucide-react'

export default function MachineWorkshopPage() {
    const params = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()
    const [projects, setProjects] = useState([])
    const [project, setProject] = useState(null)
    const [machine, setMachine] = useState(null)
    const [machines, setMachines] = useState([])
    const [selectedProjectId, setSelectedProjectId] = useState('')

    const handleContextMenu = (e, opId) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const menuWidth = 220; // Tahmini menü genişliği
        const menuHeight = 280; // Tahmini menü yüksekliği
        const padding = 10; // Ekran kenarından boşluk

        let x = e ? e.clientX : 0;
        let y = e ? e.clientY : 0;

        // Ekran sınırlarını kontrol et (Sağ ve Alt)
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - padding;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - padding;
        }

        setMenuPos({ x, y });
        setActiveOpMenuId(opId);
    };
    const [selectedMachineId, setSelectedMachineId] = useState('')
    const [bomItems, setBomItems] = useState([])
    const [selectedBomId, setSelectedBomId] = useState('')
    const [members, setMembers] = useState([])
    const [dynamicDepts, setDynamicDepts] = useState([])
    const [activeOpMenuId, setActiveOpMenuId] = useState(null)
    const [sortBy, setSortBy] = useState('orderId')
    const [sortOrder, setSortOrder] = useState('desc')

    const [operations, setOperations] = useState([])
    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false)

    const [selectedOp, setSelectedOp] = useState(null)
    const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' })

    // Filter States
    const [filterSorumlu, setFilterSorumlu] = useState('')
    const [filterStatu, setFilterStatu] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

    const [logData, setLogData] = useState({
        process: '',
        targetDate: '',
        responsibleDept: '',
        responsiblePersonId: '',
        notes: ''
    })

    useEffect(() => {
        if (profile) {
            const allProjects = storage.getProjects()
            setProjects(allProjects)

            const p = allProjects.find(pro => pro.id === params.id)
            setProject(p)

            let m = null
            if (p) {
                const macs = storage.getMachines(p.id)
                setMachines(macs)
                m = macs.find(mac => mac.id === params.machineId)
                setMachine(m)

                if (m) {
                    setSelectedProjectId(p.id)
                    setSelectedMachineId(m.id)
                }
            }

            const allOps = storage.getOperations().reverse()
            setOperations(allOps)
            setMembers(storage.getProfiles())
            const depts = storage.getDepartments().filter(d => d !== 'Yönetim')
            setDynamicDepts(depts)
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLogModalOpen(false)
                setIsStatusModalOpen(false)
                setIsTimelineModalOpen(false)
                setSelectedOp(null)
                setActiveOpMenuId(null)
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
        if (selectedProjectId) {
            setMachines(storage.getMachines(selectedProjectId))
            setSelectedMachineId('')
            setBomItems([])
        }
    }, [selectedProjectId])

    useEffect(() => {
        if (selectedMachineId) {
            const ebom = storage.getBOM(selectedMachineId, 'ebom').map(i => ({ ...i, listType: 'eBOM' }))
            const mbom = storage.getBOM(selectedMachineId, 'mbom').map(i => ({ ...i, listType: 'mBOM' }))
            setBomItems([...ebom, ...mbom])
        }
    }, [selectedMachineId])

    // Filter Logic
    const filteredOperations = useMemo(() => {
        return operations.filter(op => {
            // Sadece bu proje ve makineye ait olanları göster
            if (project && op.projectName !== project.name) return false;
            if (machine && op.machineName !== machine.name) return false;

            const matchSorumlu = !filterSorumlu || op.responsiblePerson === filterSorumlu
            const matchStatu = !filterStatu || op.status === filterStatu

            // Global search
            const searchStr = `${op.orderId} ${op.projectName} ${op.machineName} ${op.machineModel} ${op.responsiblePerson} ${op.responsibleDept} ${op.process} ${op.bomCode} ${op.bomName}`.toLowerCase()
            const matchSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase())

            return matchSorumlu && matchStatu && matchSearch
        })
    }, [operations, filterSorumlu, filterStatu, project, machine, searchTerm])

    if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>Yükleniyor...</div>
    if (!profile) return null

    const handleSaveLog = (e) => {
        e.preventDefault()
        // Bom is now optional

        const bomItem = bomItems.find(b => b.id === selectedBomId)
        const respPerson = members.find(m => m.id === logData.responsiblePersonId)
        const machine = machines.find(m => m.id === selectedMachineId)

        const opData = {
            projectName: projects.find(p => p.id === selectedProjectId)?.name,
            machineName: machine?.name,
            machineModel: machine?.model,
            bomName: bomItem?.name || (selectedOp ? selectedOp.bomName : ''),
            bomCode: bomItem?.code || (selectedOp ? selectedOp.bomCode : ''),
            listType: bomItem?.listType || (selectedOp ? selectedOp.listType : ''),
            process: logData.process,
            targetDate: logData.targetDate,
            responsibleDept: logData.responsibleDept,
            responsiblePerson: respPerson?.full_name || (selectedOp ? selectedOp.responsiblePerson : ''),
            notes: logData.notes,
            userName: profile.full_name
        }

        if (selectedOp) {
            storage.updateOperation({ ...selectedOp, ...opData })
        } else {
            storage.saveOperation(opData)
        }

        setOperations(storage.getOperations().reverse())
        setIsLogModalOpen(false)
        setSelectedOp(null)
        setLogData({ process: '', targetDate: '', responsibleDept: '', responsiblePersonId: '', notes: '' })
        setActiveOpMenuId(null) // Close menu after saving/updating
    }

    const getSortedOperations = () => {
        return [...filteredOperations].sort((a, b) => {
            let valA = a[sortBy] || '';
            let valB = b[sortBy] || '';

            if (sortBy === 'targetDate') {
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
        now.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: '#ef4444', className: 'animate-blink', fontWeight: 700 };
        if (diffDays <= 3) return { color: '#facc15', className: '', fontWeight: 700 };
        return { color: 'white', className: '' };
    };

    const handleDelete = (id) => {
        if (window.confirm('Bu aksiyonu silmek istediğinize emin misiniz?')) {
            storage.deleteOperation(id)
            setOperations(storage.getOperations().reverse())
        }
    }

    const handleStatusChange = (e) => {
        e.preventDefault()
        const updatedOp = storage.updateOperationStatus(selectedOp.id, statusUpdate.status, statusUpdate.note, profile.full_name)
        setOperations(storage.getOperations().reverse())
        setIsStatusModalOpen(false)
        setStatusUpdate({ status: '', note: '' })
        setActiveOpMenuId(null) // Close menu after status change
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

    // Summary stats
    const stats = {
        total: filteredOperations.length,
        active: filteredOperations.filter(o => o.status === 'İşlemde').length,
        pending: filteredOperations.filter(o => o.status === 'Bekliyor').length,
        completed: filteredOperations.filter(o => o.status === 'Tamamlandı').length
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

                <header className="header" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '0.75rem', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{machine?.name} / Çalıştay Notları</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>{project?.name} projesinin {machine?.name} makinesi için tüm aksiyon ve çalışma süreçleri.</p>
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
                <section className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--card)' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'end' }}>
                        {[
                            { label: 'Sorumlu', value: filterSorumlu, setter: setFilterSorumlu, options: Array.from(new Set(operations.map(o => o.responsiblePerson))), placeholder: 'Tüm Personeller' },
                            {
                                label: 'Statü', value: filterStatu, setter: setFilterStatu,
                                options: ['Bekliyor', 'İşlemde', 'Tamamlandı', 'Durduruldu'],
                                placeholder: 'Tüm Statüler'
                            }
                        ].map((filter, idx) => (
                            <div key={idx}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filter.label}</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        style={{
                                            width: '100%',
                                            background: 'var(--secondary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            padding: '0.7rem 1rem',
                                            paddingRight: '2.5rem',
                                            color: 'var(--foreground)',
                                            outline: 'none',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            appearance: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                        value={filter.value}
                                        onChange={e => filter.setter(e.target.value)}
                                        onMouseEnter={e => e.target.style.borderColor = 'var(--primary)'}
                                        onMouseLeave={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                    >
                                        <option value="" style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{filter.placeholder}</option>
                                        {filter.options.map(opt => (
                                            <option key={opt} value={opt} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{opt}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted-foreground)' }}>
                                        <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => { setFilterSorumlu(''); setFilterStatu(''); setSearchTerm(''); }}
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
                                            { label: 'No / Statü', key: 'orderId', width: '100px' },
                                            { label: 'BOM / Parça', key: 'bomCode' },
                                            { label: 'Yapılan İşlem', key: 'process' },
                                            { label: 'Sorumlu Bölüm', key: 'responsibleDept' },
                                            { label: 'Sorumlu Kişi', key: 'responsiblePerson' },
                                            { label: 'Hedef Tarih', key: 'targetDate' }
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
                                                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{op.orderId}</div>
                                                <span className="status-badge" style={{ background: getStatusColor(op.status).bg, color: getStatusColor(op.status).text, fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>{op.status}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 500 }}>{op.bomCode || '-'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{op.bomName}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div style={{ color: 'var(--foreground)' }}>{op.process}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{op.responsibleDept}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{op.responsiblePerson}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                <div
                                                    className={getTargetDateStyle(op.targetDate, op.status).className}
                                                    style={{
                                                        color: getTargetDateStyle(op.targetDate, op.status).color,
                                                        fontWeight: getTargetDateStyle(op.targetDate, op.status).fontWeight || 400
                                                    }}
                                                >
                                                    {op.targetDate ? new Date(op.targetDate).toLocaleDateString('tr-TR') : '-'}
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
            {isLogModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '95vw', padding: '3rem', background: 'var(--card)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedOp ? 'Aksiyonu Düzenle' : 'Yeni Aksiyon Başlat'}</h3>
                            <button onClick={() => { setIsLogModalOpen(false); setSelectedOp(null); setLogData({ process: '', targetDate: '', responsibleDept: '', responsiblePersonId: '', notes: '' }); }} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                <X size={28} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLog}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Proje</label>
                                    <select disabled style={{ opacity: 0.6, width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                                        <option value="">Proje Seçin</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Makine</label>
                                    <select disabled style={{ opacity: 0.6, width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
                                        <option value="">Makine Seçin</option>
                                        {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.model})</option>)}
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

                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Hedef Tamamlanma Tarihi</label>
                                <input type="date" required style={{ width: '100%', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }} value={logData.targetDate} onChange={e => setLogData({ ...logData, targetDate: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button" onClick={() => { setIsLogModalOpen(false); setSelectedOp(null); }} className="btn" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>İptal</button>
                                <button type="submit" className="btn btn-primary">{selectedOp ? 'Güncelle' : 'Aksiyonu Başlat'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isStatusModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="card animate-fade-in" style={{ width: '450px', padding: '2.5rem', background: 'var(--card)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>{selectedOp?.orderId} / Statü Güncelle</h3>
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
                </div>
            )}

            {isTimelineModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)' }}>
                    <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '95vw', padding: '3rem', background: 'var(--card)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedOp?.orderId} / Süreç Takibi</h3>
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
                </div>
            )}


            {/* Global Context Menu */}
            {activeOpMenuId && operations.find(o => o.id === activeOpMenuId) && (
                <div
                    className="card animate-fade-in"
                    style={{
                        position: 'fixed',
                        left: `${menuPos.x}px`,
                        top: `${menuPos.y}px`,
                        zIndex: 999999,
                        minWidth: '220px',
                        padding: '0.6rem',
                        background: '#18181b',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 25px 70px rgba(0, 0, 0, 1)',
                        textAlign: 'left',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(() => {
                        const op = operations.find(o => o.id === activeOpMenuId);
                        return (
                            <>
                                <div style={{ padding: '0.6rem 0.6rem 0.4rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.4rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.1rem' }}>{op.orderId}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.projectName}</div>
                                </div>
                                <button
                                    onClick={() => { setSelectedOp(op); setStatusUpdate({ status: op.status, note: '' }); setIsStatusModalOpen(true); setActiveOpMenuId(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', borderRadius: 'var(--radius)' }}
                                    className="nav-item-mini"
                                >
                                    <Play size={14} /> Statü Güncelle
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedOp(op);
                                        setActiveOpMenuId(null);
                                        const proj = projects.find(p => p.name === op.projectName);
                                        if (proj) {
                                            setSelectedProjectId(proj.id);
                                            const mach = storage.getMachines(proj.id).find(m => m.name === op.machineName);
                                            if (mach) {
                                                setSelectedMachineId(mach.id);
                                                setTimeout(() => {
                                                    const bom = storage.getBOM(mach.id, op.listType.toLowerCase()).find(b => b.code === op.bomCode);
                                                    if (bom) setSelectedBomId(bom.id);
                                                    const resp = members.find(m => m.full_name === op.responsiblePerson);
                                                    setLogData({ process: op.process, targetDate: op.targetDate, responsibleDept: op.responsibleDept, responsiblePersonId: resp ? resp.id : '', notes: op.notes });
                                                    setIsLogModalOpen(true);
                                                }, 100);
                                            }
                                        }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.9rem', borderRadius: 'var(--radius)' }}
                                    className="nav-item-mini"
                                >
                                    <Edit3 size={14} color="#3b82f6" /> Düzenle
                                </button>
                                <button
                                    onClick={() => { setSelectedOp(op); setIsTimelineModalOpen(true); setActiveOpMenuId(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', borderRadius: 'var(--radius)' }}
                                    className="nav-item-mini"
                                >
                                    <Activity size={14} /> Süreç Geçmişi
                                </button>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.3rem 0' }} />
                                <button
                                    onClick={() => { handleDelete(op.id); setActiveOpMenuId(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', padding: '0.75rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', borderRadius: 'var(--radius)' }}
                                    className="nav-item-mini"
                                >
                                    <Trash2 size={14} /> Sil
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    )
}
