'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    ArrowLeftRight,
    Plus,
    Search,
    Download,
    ArrowDownCircle,
    ArrowUpCircle,
    History,
    Filter,
    X,
    Calendar,
    User,
    Package,
    Navigation,
    ShoppingCart,
    Edit2,
    MoreVertical,
    Trash2,
    Shield
} from 'lucide-react'

export default function ToolroomInOutPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_in_out') || profile?.roles?.name === 'Admin'
    const canInOut = profile?.roles?.permissions?.includes('toolroom_in_out') || profile?.roles?.name === 'Admin'
    const canDeleteRecord = profile?.roles?.permissions?.includes('delete_toolroom_transaction') || profile?.roles?.name === 'Admin'

    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [basket, setBasket] = useState([])

    // Shared Data
    const [sharedData, setSharedData] = useState({
        type: 'Çıkış',
        location: 'Fabrika İşleri',
        department: 'Akışkan Montaj',
        reciever_sender: ''
    })

    // Current Item Form
    const [formData, setFormData] = useState({
        item_no: '',
        item_description: '',
        measurement_description: '',
        quantity: 1,
        is_calibration: false,
        serial_no: ''
    })

    const [items, setItems] = useState([])
    const [itemSuggestions, setItemSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [definitions, setDefinitions] = useState([])
    const [deptsList, setDeptsList] = useState([])
    const [profilesList, setProfilesList] = useState([])
    const [locationType, setLocationType] = useState('genel') // 'genel' or 'proje'
    const [selectedProject, setSelectedProject] = useState('')
    const [selectedMachine, setSelectedMachine] = useState('')

    const [editingTransaction, setEditingTransaction] = useState(null)
    const [editModalOpen, setEditModalOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_transactions')
            .select('*')
            .order('sequence_no', { ascending: false })

        if (!error) setTransactions(data || [])

        const { data: itemData } = await supabase
            .from('toolroom_items')
            .select('*')
            .order('item_description', { ascending: true })

        if (itemData) setItems(itemData)

        const { data: defData } = await supabase
            .from('toolroom_definitions')
            .select('*')
            .order('value', { ascending: true })

        if (defData) setDefinitions(defData)

        const { data: dList } = await supabase.from('depts').select('*').order('name')
        setDeptsList(dList || [])

        const { data: pList } = await supabase.from('profiles').select('id, full_name, department').order('full_name')
        setProfilesList(pList || [])

        setLoading(false)
    }

    const handleDeleteTransaction = async (t) => {
        if (!canDeleteRecord) {
            alert('Bu işlemi silmek için yetkiniz bulunmamaktadır.');
            return;
        }
        if (!confirm(`BU İŞLEM SİLİNECEK! \n\n${t.item_description} (${t.quantity} Adet) işlemi iptal edilecek ve stok geri alınacaktır. Emin misiniz?`)) return;

        setLoading(true)
        try {
            const { data: currentItem, error: itemError } = await supabase
                .from('toolroom_items')
                .select('*')
                .eq('item_no', t.item_no)
                .eq('item_description', t.item_description)
                .maybeSingle();

            if (currentItem && !itemError) {
                const newQty = (currentItem.quantity || 0) - (t.quantity || 0);
                await supabase.from('toolroom_items').update({ quantity: newQty }).eq('id', currentItem.id);
            }

            await supabase.from('toolroom_transactions').delete().eq('id', t.id);

            alert('İşlem silindi ve stok güncellendi.');
            fetchData();
        } catch (err) {
            alert('Silme hatası: ' + err.message);
        } finally {
            setLoading(false)
        }
    }

    const handleEditOpen = (t) => {
        if (!canInOut) {
            alert('Düzenleme yetkiniz bulunmamaktadır.');
            return;
        }
        setEditingTransaction({ ...t });
        setEditModalOpen(true);
    }

    const handleSaveEdit = async () => {
        if (!canInOut) {
            alert('İşlem yapmak için yetkiniz bulunmamaktadır.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('toolroom_transactions')
                .update({
                    department: editingTransaction.department,
                    reciever_sender: editingTransaction.reciever_sender,
                    location: editingTransaction.location
                })
                .eq('id', editingTransaction.id);

            if (error) throw error;

            alert('Kayıt başarıyla güncellendi.');
            setEditModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Güncelleme hatası: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    const handleItemSearch = (field, val) => {
        setFormData({ ...formData, [field]: val })

        if (val.trim().length > 0) {
            const matches = items.filter(i =>
                i.item_description?.toLowerCase().includes(val.toLowerCase()) ||
                i.item_no?.toLowerCase().includes(val.toLowerCase()) ||
                (i.is_calibration && i.serial_no?.toLowerCase().includes(val.toLowerCase()))
            ).slice(0, 8)
            setItemSuggestions(matches)
            setShowSuggestions(true)
        } else {
            setItemSuggestions([])
            setShowSuggestions(false)
        }
    }

    const selectItem = (item) => {
        setFormData({
            ...formData,
            item_no: item.item_no || '',
            item_description: item.item_description || '',
            measurement_description: item.measurement_description || '',
            is_calibration: item.is_calibration || false,
            serial_no: item.serial_no || ''
        })
        setShowSuggestions(false)
        setItemSuggestions([])
    }

    const addToBasket = () => {
        if (!formData.item_no || !formData.item_description || formData.quantity < 1) {
            alert('Lütfen geçerli bir ürün ve miktar girin.')
            return
        }

        // Stok kontrolü (Çıkış veya Zimmet tipinde)
        if (sharedData.type === 'Çıkış' || sharedData.type === 'Zimmet') {
            const targetItem = items.find(i => i.item_no === formData.item_no && i.item_description === formData.item_description)
            const alreadyInBasket = basket
                .filter(b => b.item_no === formData.item_no && b.item_description === formData.item_description)
                .reduce((total, b) => total + b.quantity, 0)

            const currentStock = targetItem ? (targetItem.quantity || 0) : 0
            if (currentStock < (alreadyInBasket + formData.quantity)) {
                alert(`Yetersiz stok! \n\nMevcut Stok: ${currentStock} \nSepetteki: ${alreadyInBasket} \nEklenmek İstenen: ${formData.quantity} \n\nLütfen stok miktarını aşmayınız.`)
                return
            }
        }

        setBasket([...basket, { ...formData, id: Date.now() }])
        setFormData({
            item_no: '',
            item_description: '',
            measurement_description: '',
            quantity: 1,
            is_calibration: false,
            serial_no: ''
        })
    }

    const removeFromBasket = (id) => {
        setBasket(basket.filter(i => i.id !== id))
    }

    const handleSaveBatch = async () => {
        if (basket.length === 0) {
            alert('Sepet boş. Lütfen önce ürün ekleyin.')
            return
        }

        if ((sharedData.type === 'Çıkış' || sharedData.type === 'Zimmet') && (!sharedData.location || sharedData.location === 'Takımhane')) {
            alert('Lütfen çıkış veya zimmet yapmadan evvel bir Proje veya Lokasyon seçin.')
            return
        }

        if (!sharedData.reciever_sender) {
            alert('Lütfen Kime/Kimden bilgisini doldurun.')
            return
        }

        setLoading(true)

        try {
            if (sharedData.type === 'Çıkış' || sharedData.type === 'Zimmet') {
                for (const row of basket) {
                    const targetItem = items.find(i => i.item_no === row.item_no && i.item_description === row.item_description)
                    const totalRequestedForThisItem = basket
                        .filter(b => b.item_no === row.item_no && b.item_description === row.item_description)
                        .reduce((total, b) => total + b.quantity, 0)

                    if (!targetItem || (targetItem.quantity || 0) < totalRequestedForThisItem) {
                        alert(`İşlem Durduruldu! \n\n${row.item_description} için yeterli stok bulunamadı. \nGereken: ${totalRequestedForThisItem}, Mevcut: ${targetItem?.quantity || 0}`);
                        setLoading(false)
                        return
                    }
                }
            }

            for (const row of basket) {
                const change = (sharedData.type === 'Çıkış' || sharedData.type === 'Zimmet') ? -Math.abs(row.quantity) : Math.abs(row.quantity)
                const targetItem = items.find(i => i.item_no === row.item_no && i.item_description === row.item_description)

                let newStock = 0
                if (targetItem) {
                    newStock = (targetItem.quantity || 0) + change
                    await supabase.from('toolroom_items').update({ quantity: newStock }).eq('id', targetItem.id)
                }

                await supabase.from('toolroom_transactions').insert([{
                    item_no: row.item_no,
                    item_description: row.item_description,
                    measurement_description: row.is_calibration ? null : row.measurement_description,
                    serial_no: row.is_calibration ? row.serial_no : null,
                    is_calibration: row.is_calibration,
                    quantity: change,
                    department: sharedData.department,
                    reciever_sender: sharedData.reciever_sender,
                    location: sharedData.location,
                    transaction_type: sharedData.type,
                    current_stock: newStock,
                    transaction_date: new Date().toISOString()
                }])
            }

            setIsModalOpen(false)
            setBasket([])
            setSharedData({ type: 'Çıkış', location: 'Fabrika İşleri', department: 'Akışkan Montaj', reciever_sender: '' })
            setLocationType('genel')
            fetchData()
        } catch (err) {
            alert('Hata oluştu: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetModal = () => {
        setIsModalOpen(false);
        setBasket([]);
        setFormData({ item_no: '', item_description: '', measurement_description: '', quantity: 1, is_calibration: false, serial_no: '' });
        setSharedData({ type: 'Çıkış', location: 'Fabrika İşleri', department: 'Akışkan Montaj', reciever_sender: '' });
        setLocationType('genel');
    }

    const filtered = transactions.filter(t =>
        t.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Shield style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in shadow-xl">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                            <ArrowLeftRight size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takım Giriş-Çıkış Kayıtları</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Takımhane üzerinden gerçekleştirilen tüm hareketlerin dökümü.</p>
                        </div>
                    </div>

                    {canInOut && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsModalOpen(true)}
                            style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 700 }}
                        >
                            <Plus size={20} style={{ marginRight: '0.5rem' }} /> Yeni Hareket İşle
                        </button>
                    )}
                </header>

                <div className="card" style={{
                    marginBottom: '2rem',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ position: 'relative', width: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', opacity: 0.6 }} />
                            <input
                                type="text"
                                placeholder="Kalem No, Tanım veya Lokasyon-Proje ara..."
                                className="input-field"
                                style={{
                                    paddingLeft: '3.25rem',
                                    background: 'var(--background)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary" style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Filter size={18} style={{ marginRight: '0.5rem' }} /> Filtrele
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Download size={18} style={{ marginRight: '0.5rem' }} /> Excel'e Aktar
                        </button>
                    </div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(74, 222, 128, 0.05)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Sıra No</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>İşlem</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Kalem No</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Kalem Tanımı</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Ölçü / Seri No</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Miktar</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Bölüm</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Kime/Kimden</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Stok</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Lokasyon - Proje</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em' }}>Tarih</th>
                                <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#4ade80', letterSpacing: '0.05em', textAlign: 'center' }}>Aksiyonlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && transactions.length === 0 ? (
                                <tr><td colSpan="12" style={{ padding: '3rem', textAlign: 'center' }}>Yükleniyor...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="12" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Kayıt bulunamadı.</td></tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: '0.2s', cursor: 'default' }} className="table-row-hover">
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', opacity: 0.5, fontWeight: 500 }}>#{t.sequence_no}</td>
                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: t.transaction_type === 'Giriş' ? '#4ade80' : t.transaction_type === 'Zimmet' ? '#3b82f6' : '#ef4444' }}>{t.transaction_type}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>{t.item_no || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.item_description}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: t.is_calibration ? 'var(--primary)' : 'var(--muted-foreground)', fontWeight: t.is_calibration ? 700 : 400 }}>
                                        {t.is_calibration ? (t.serial_no || '-') : (t.measurement_description || '-')}
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: t.quantity > 0 ? '#4ade80' : '#ef4444', fontSize: '0.85rem', fontWeight: 800 }}>
                                            {t.quantity > 0 ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                                            {Math.abs(t.quantity)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.department || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>{t.reciever_sender || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>{t.current_stock || 0}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>{t.location || '-'}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                        {new Date(t.transaction_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            {canInOut && (
                                                <button
                                                    onClick={() => handleEditOpen(t)}
                                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Düzenle"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDeleteRecord && (
                                                <button
                                                    onClick={() => handleDeleteTransaction(t)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bulk Modal Form */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <div className="card animate-scale-in" style={{
                            width: '1050px',
                            maxWidth: '95%',
                            padding: '2.5rem',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2rem',
                            boxShadow: '0 50px 100px rgba(0,0,0,0.3)',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '24px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                                        color: 'white',
                                        borderRadius: '16px',
                                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
                                    }}>
                                        <ShoppingCart size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Toplu Giriş - Çıkış İşlemi</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Birden fazla kalemi tek seferde işleme alın.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetModal}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--muted-foreground)',
                                        cursor: 'pointer',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: '0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                ><X size={24} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', overflow: 'hidden' }}>
                                {/* Left: Form */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '1.5rem', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1.25rem'
                                    }}>
                                        <div>
                                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>1. GENEL BİLGİLER</h4>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>İşlem Tipi</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <button
                                                        onClick={() => setSharedData({ ...sharedData, type: 'Giriş', location: 'Takımhane' })}
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '12px',
                                                            background: sharedData.type === 'Giriş' ? '#4ade80' : 'rgba(255,255,255,0.03)',
                                                            color: sharedData.type === 'Giriş' ? 'black' : 'var(--muted-foreground)',
                                                            border: '1px solid ' + (sharedData.type === 'Giriş' ? '#4ade80' : 'var(--border)'),
                                                            cursor: 'pointer',
                                                            fontWeight: 800,
                                                            transition: '0.2s',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >GİRİŞ</button>
                                                    <button
                                                        onClick={() => {
                                                            setLocationType('genel');
                                                            setSharedData({ ...sharedData, type: 'Çıkış', location: 'Fabrika İşleri' });
                                                        }}
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '12px',
                                                            background: sharedData.type === 'Çıkış' ? '#ef4444' : 'rgba(255,255,255,0.03)',
                                                            color: sharedData.type === 'Çıkış' ? 'white' : 'var(--muted-foreground)',
                                                            border: '1px solid ' + (sharedData.type === 'Çıkış' ? '#ef4444' : 'var(--border)'),
                                                            cursor: 'pointer',
                                                            fontWeight: 800,
                                                            transition: '0.2s',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >ÇIKIŞ</button>
                                                    <button
                                                        onClick={() => {
                                                            setLocationType('genel');
                                                            setSharedData({ ...sharedData, type: 'Zimmet', location: 'Kişisel Zimmet' });
                                                        }}
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '12px',
                                                            background: sharedData.type === 'Zimmet' ? '#3b82f6' : 'rgba(255,255,255,0.03)',
                                                            color: sharedData.type === 'Zimmet' ? 'white' : 'var(--muted-foreground)',
                                                            border: '1px solid ' + (sharedData.type === 'Zimmet' ? '#3b82f6' : 'var(--border)'),
                                                            cursor: 'pointer',
                                                            fontWeight: 800,
                                                            transition: '0.2s',
                                                            letterSpacing: '0.05em'
                                                        }}
                                                    >ZİMMET</button>
                                                    <button
                                                        disabled
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '12px',
                                                            background: 'rgba(255,255,255,0.01)',
                                                            color: 'rgba(255,255,255,0.1)',
                                                            border: '1px solid var(--border)',
                                                            cursor: 'not-allowed',
                                                            fontWeight: 800,
                                                            opacity: 0.5,
                                                            letterSpacing: '0.05em'
                                                        }}
                                                        title="Yakında eklenecek..."
                                                    >HURDA</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ minHeight: '115px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            {sharedData.type === 'Çıkış' || sharedData.type === 'Zimmet' ? (
                                                <>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Lokasyon / Proje</label>
                                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                                        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                                            <input type="radio" checked={locationType === 'genel'} onChange={() => { setLocationType('genel'); setSharedData({ ...sharedData, location: 'Fabrika İşleri' }) }} /> Genel
                                                        </label>
                                                        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                                            <input type="radio" checked={locationType === 'proje'} onChange={() => { setLocationType('proje'); setSharedData({ ...sharedData, location: '' }) }} /> Proje
                                                        </label>
                                                    </div>
                                                    {locationType === 'genel' ? (
                                                        <select className="input-field" value={sharedData.location} onChange={e => setSharedData({ ...sharedData, location: e.target.value })}>
                                                            <option value="">Seçiniz...</option>
                                                            {definitions.filter(d => d.type === 'location').map(d => <option key={d.id} value={d.value}>{d.value}</option>)}
                                                        </select>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <select className="input-field" style={{ flex: 1 }} value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedMachine('') }}>
                                                                <option value="">Proje...</option>
                                                                {definitions.filter(d => d.type === 'project').map(d => <option key={d.id} value={d.id}>{d.value}</option>)}
                                                            </select>
                                                            <select className="input-field" style={{ flex: 1 }} value={selectedMachine} onChange={e => {
                                                                const proj = definitions.find(d => d.id === selectedProject)?.value;
                                                                setSelectedMachine(e.target.value);
                                                                setSharedData({ ...sharedData, location: proj + " / " + e.target.value });
                                                            }} disabled={!selectedProject}>
                                                                <option value="">Makine...</option>
                                                                {definitions.filter(d => d.type === 'machine' && d.parent_id === selectedProject).map(d => <option key={d.id} value={d.value}>{d.value}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Lokasyon / Proje</label>
                                                    <div style={{ padding: '0.75rem', color: '#4ade80', fontWeight: 800, fontSize: '1rem', background: 'rgba(74, 222, 128, 0.05)', borderRadius: '8px' }}>
                                                        TAKIMHANE (Otomatik)
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Bölüm</label>
                                                <select
                                                    className="input-field"
                                                    value={sharedData.department}
                                                    onChange={e => setSharedData({ ...sharedData, department: e.target.value })}
                                                >
                                                    <option value="">Bölüm Seçiniz...</option>
                                                    {deptsList.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Teslim Alan/Veren</label>
                                                <select
                                                    className="input-field"
                                                    value={sharedData.reciever_sender}
                                                    onChange={e => setSharedData({ ...sharedData, reciever_sender: e.target.value })}
                                                >
                                                    <option value="">Personel Seçiniz...</option>
                                                    {profilesList.filter(p => !sharedData.department || p.department === sharedData.department).map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Item Entry and Basket */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
                                    <div style={{
                                        background: 'rgba(59, 130, 246, 0.03)',
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(59, 130, 246, 0.1)',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>2. KALEM EKLE</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input className="input-field" style={{ borderRadius: '12px' }} value={formData.item_no} onChange={e => handleItemSearch('item_no', e.target.value)} placeholder="Parça Kodu Ara..." />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input className="input-field" style={{ borderRadius: '12px' }} value={formData.item_description} onChange={e => handleItemSearch('item_description', e.target.value)} placeholder="Ürün Tanımı..." />
                                                {showSuggestions && itemSuggestions.length > 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', zIndex: 100, marginTop: '5px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                                                        {itemSuggestions.map((it, idx) => (
                                                            <div key={it.id} onClick={() => selectItem(it)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: idx === itemSuggestions.length - 1 ? 'none' : '1px solid var(--border)', fontSize: '0.85rem', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                <div style={{ fontWeight: 700 }}>{it.item_no}</div>
                                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{it.item_description} {it.is_calibration ? `(SN: ${it.serial_no})` : ''}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '1rem' }}>
                                                <input
                                                    readOnly
                                                    className="input-field"
                                                    style={{ background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', color: formData.is_calibration ? 'var(--primary)' : 'rgba(255,255,255,0.5)', fontWeight: formData.is_calibration ? 800 : 400, borderRadius: '12px' }}
                                                    value={formData.is_calibration ? (formData.serial_no || '') : (formData.measurement_description || '')}
                                                    placeholder={formData.is_calibration ? "Seri No (Otomatik)" : "Ölçü / Özellik (Otomatik)"}
                                                />
                                                <input type="number" className="input-field" style={{ borderRadius: '12px', textAlign: 'center', fontWeight: 800 }} value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addToBasket}
                                                style={{
                                                    padding: '1rem',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)',
                                                    transition: '0.2s',
                                                    letterSpacing: '0.05em'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                LİSTEYE EKLE
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>İşlem Listesi ({basket.length})</h4>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '0.5rem' }}>
                                            {basket.length === 0 ? (
                                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                                    <ShoppingCart size={48} />
                                                    <p style={{ marginTop: '1rem' }}>Sepetiniz Şu An Boş</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {basket.map((it) => (
                                                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{it.item_description}</div>
                                                                <div style={{ fontSize: '0.7rem', color: it.is_calibration ? 'var(--primary)' : 'var(--muted-foreground)', fontWeight: it.is_calibration ? 700 : 400 }}>
                                                                    {it.item_no} | {it.is_calibration ? (`SN: ${it.serial_no}`) : it.measurement_description}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', minWidth: '40px', textAlign: 'center', padding: '0.25rem', borderRadius: '6px' }}>{it.quantity}</div>
                                                                <button onClick={() => removeFromBasket(it.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSaveBatch}
                                            disabled={basket.length === 0 || loading}
                                            style={{
                                                width: '100%',
                                                padding: '1.25rem',
                                                background: loading ? 'gray' : 'linear-gradient(45deg, #3b82f6, #2563eb)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 900,
                                                fontSize: '1.1rem',
                                                cursor: basket.length === 0 || loading ? 'not-allowed' : 'pointer',
                                                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
                                                transition: '0.3s'
                                            }}
                                        >
                                            {loading ? 'KAYDEDİLİYOR...' : `TÜMÜNÜ KAYDET (${basket.length} KALEM)`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editModalOpen && editingTransaction && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100001 }}>
                        <div className="card animate-scale-in" style={{ width: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.5rem', background: '#3b82f6', borderRadius: '10px' }}><Edit2 size={24} /></div>
                                    <h3 style={{ fontWeight: 800 }}>Kaydı Düzenle</h3>
                                </div>
                                <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={32} /></button>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                                <b style={{ color: 'white' }}>{editingTransaction.item_description}</b> için yapılan
                                <b style={{ color: editingTransaction.transaction_type === 'Giriş' ? '#4ade80' : '#ef4444' }}> {editingTransaction.transaction_type} ({editingTransaction.quantity} Adet)</b> işlemini düzenliyorsunuz.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Bölüm</label>
                                    <select
                                        className="input-field"
                                        value={editingTransaction.department}
                                        onChange={e => setEditingTransaction({ ...editingTransaction, department: e.target.value })}
                                    >
                                        <option value="">Bölüm Seçiniz...</option>
                                        {deptsList.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Teslim Alan/Veren</label>
                                    <select
                                        className="input-field"
                                        value={editingTransaction.reciever_sender}
                                        onChange={e => setEditingTransaction({ ...editingTransaction, reciever_sender: e.target.value })}
                                    >
                                        <option value="">Personel Seçiniz...</option>
                                        {profilesList.filter(p => !editingTransaction.department || p.department === editingTransaction.department).map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Lokasyon / Proje</label>
                                    <input
                                        className="input-field"
                                        value={editingTransaction.location}
                                        onChange={e => setEditingTransaction({ ...editingTransaction, location: e.target.value })}
                                        placeholder="Lokasyon bilgisi..."
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        onClick={() => setEditModalOpen(false)}
                                        style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        İPTAL
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        style={{ flex: 1, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 30px rgba(59,130,246,0.3)' }}
                                    >
                                        KAYDET
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
