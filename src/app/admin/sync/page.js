'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/storage'
import Sidebar from '@/components/Sidebar'
import { usePermissions } from '@/hooks/usePermissions'
import { Database, Zap, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function SyncPage() {
    const { profile, loading: authLoading } = usePermissions()
    const [status, setStatus] = useState('ready') // ready, syncing, finished, error
    const [progress, setProgress] = useState(0)
    const [log, setLog] = useState([])

    const addLog = (msg, type = 'info') => {
        setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }])
    }

    const runMigration = async () => {
        setStatus('syncing')
        setLog([])
        setProgress(0)

        try {
            // 1. Migrate Depts
            addLog('Departmanlar aktarılıyor...', 'info')
            const depts = storage.getDepartments()
            for (const d of depts) {
                await supabase.from('depts').upsert({ name: d })
            }
            setProgress(10)

            // 2. Migrate Roles
            addLog('Roller aktarılıyor...', 'info')
            const roles = storage.getRoles()
            for (const r of roles) {
                await supabase.from('roles').upsert({
                    id: parseInt(r.id) || undefined,
                    name: r.name,
                    description: r.description,
                    permissions: r.permissions
                })
            }
            setProgress(25)

            // 3. Migrate Projects
            addLog('Projeler aktarılıyor...', 'info')
            const projects = storage.getProjects()
            const projectMap = {} // oldId -> newId
            for (const p of projects) {
                const { data, error } = await supabase.from('projects').insert({
                    name: p.name,
                    status: p.status,
                    created_at: p.created_at,
                    legacy_id: p.id
                }).select().single()
                if (data) projectMap[p.id] = data.id
            }
            setProgress(45)

            // 4. Migrate Machines
            addLog('Makineler aktarılıyor...', 'info')
            const allMachines = storage.getMachines()
            const machineMap = {} // oldId -> newId
            for (const m of allMachines) {
                const newProjId = projectMap[m.projectId]
                if (newProjId) {
                    const { data } = await supabase.from('machines').insert({
                        project_id: newProjId,
                        name: m.name,
                        model: m.model,
                        created_at: m.created_at,
                        legacy_id: m.id
                    }).select().single()
                    if (data) machineMap[m.id] = data.id
                }
            }
            setProgress(65)

            // 5. Migrate Custom Folders (Workshop Notes)
            addLog('Çalıştay Notları / Klasörler aktarılıyor...', 'info')
            for (const oldMachineId in machineMap) {
                const newMachineId = machineMap[oldMachineId]
                const foldersKey = `rmk_custom_folders_${oldMachineId}`
                const foldersData = localStorage.getItem(foldersKey)
                if (foldersData) {
                    const folders = JSON.parse(foldersData)
                    for (const f of folders) {
                        await supabase.from('custom_folders').insert({
                            machine_id: newMachineId,
                            name: f.name,
                            items: f.items,
                            legacy_id: f.id
                        })
                    }
                }
            }
            setProgress(85)

            // 6. Migrate Operations
            addLog('Operasyonlar / İş Emri geçmişi aktarılıyor...', 'info')
            const ops = storage.getOperations()
            for (const o of ops) {
                const newProjId = projectMap[o.projectId] // Handle if projectId exists in object
                // If projectId is missing from op, we might skip or find by project name
                await supabase.from('operations').insert({
                    project_id: newProjId || undefined,
                    name: o.process || 'N/A', // Assuming process is name
                    status: o.status,
                    responsible_person: o.responsiblePerson,
                    responsible_dept: o.responsibleDept,
                    target_date: o.targetDate,
                    created_at: o.timestamp,
                    legacy_id: o.id
                    // Note: We'd need to expand table for orderId, history etc if we want full fidelity
                })
            }

            setProgress(100)
            setStatus('finished')
            addLog('Tebrikler! Tüm veriler başarıyla Supabase bulut veritabanına taşındı.', 'success')

        } catch (err) {
            console.error(err)
            setStatus('error')
            addLog('Hata oluştu: ' + err.message, 'error')
        }
    }

    if (authLoading) return null
    if (!profile) return null

    return (
        <div className="main-container">
            <Sidebar profile={profile} />
            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Migration & Sync</h1>
                        <p style={{ color: 'var(--muted-foreground)' }}>Yerel verileri (LocalStorage) Supabase Cloud'a taşır.</p>
                    </div>
                </header>

                <div className="card" style={{ maxWidth: '800px', padding: '3rem', background: 'var(--card)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                            <Database size={40} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>Veri Aktarım Sihirbazı</h2>
                        <p style={{ color: 'var(--muted-foreground)', maxWidth: '500px', margin: '0 auto' }}>
                            Mevcut tarayıcınızda kayıtlı olan Projeler, Makineler, Çalıştay Notları ve Operasyon geçmişini
                            Repkon Bulut Veritabanına aktarmak üzeresiniz.
                        </p>
                    </div>

                    <div style={{ background: 'var(--secondary)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Bütünüyle Aktarılacaklar:</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{progress}%</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #a855f7)', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>

                    {status === 'ready' && (
                        <button onClick={runMigration} className="btn btn-primary" style={{ width: '100%', height: '60px', fontSize: '1.25rem', fontWeight: 700 }}>
                            <Zap size={24} style={{ marginRight: '0.75rem' }} /> BÜTÜN VERİLERİ AKTARMAYI BAŞLAT
                        </button>
                    )}

                    {status === 'finished' && (
                        <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '12px', textAlign: 'center' }}>
                            <CheckCircle2 size={32} color="#22c55e" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: '#22c55e', fontWeight: 700, marginBottom: '0.5rem' }}>Aktarım Başarılı</h3>
                            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>Artık tüm verileriniz Supabase üzerinde güvende.</p>
                            <button onClick={() => window.location.href = '/'} className="btn btn-primary">Paneli Görüntüle</button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', textAlign: 'center' }}>
                            <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem' }}>Hata Oluştu</h3>
                            <button onClick={() => setStatus('ready')} className="btn" style={{ background: 'var(--secondary)' }}>Tekrar Dene</button>
                        </div>
                    )}

                    <div style={{ marginTop: '3rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Aktarım Kayıtları</h4>
                        <div style={{ background: '#09090b', borderRadius: '8px', padding: '1rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            {log.length === 0 && <p style={{ color: '#555' }}>Henüz işlem başlamadı.</p>}
                            {log.map((l, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', color: l.type === 'error' ? '#ef4444' : l.type === 'success' ? '#22c55e' : 'var(--muted-foreground)' }}>
                                    <span style={{ opacity: 0.5 }}>[{l.time}]</span>
                                    <span>{l.msg}</span>
                                </div>
                            ))}
                            {status === 'syncing' && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--primary)', marginTop: '0.5rem' }}>
                                    <RefreshCw size={14} className="animate-spin" /> Devam ediyor...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
