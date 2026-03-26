'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import ProjectModal from '@/components/ProjectModal'
import Sidebar from '@/components/Sidebar'
import Login from './login/page'
import {
  Plus,
  Activity,
  Clock,
  Edit3,
  Calendar,
  Truck,
  Bell,
  MessageSquare,
  History,
  ChevronRight
} from 'lucide-react'

export default function Home() {
  const { profile, loading: authLoading } = usePermissions()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  // Notification states
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Fetch Projects from Supabase
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projError) throw projError
      setProjects(projData || [])

      // 2. Fetch Notifications for the current user
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notifError) throw notifError

      const unread = (notifData || []).filter(n => !n.is_read)

      setNotifications(notifData || [])
      setUnreadCount(unread.length)

    } catch (err) {
      console.error('Data error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }

    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [profile])


  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen)
    if (!isNotifOpen && unreadCount > 0) {
      localStorage.setItem('rmk_notifications_read', Date.now().toString())
      setUnreadCount(0)
    }
  }

  const handleOpenModal = (proj = null) => {
    setEditingProject(proj)
    setIsProjectModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsProjectModalOpen(false)
    setEditingProject(null)
  }

  const handleProjectAdded = () => {
    fetchData()
  }

  if (authLoading) return <div style={{ background: '#09090b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>

  if (!profile) {
    return <Login />
  }

  const isAdmin = profile.roles?.name === 'Admin'

  return (
    <div className="main-container">
      <Sidebar profile={profile} />

      <main className="content animate-fade-in" style={{ minWidth: 0 }}>
        <header className="header" style={{ marginBottom: '3rem', position: 'relative' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Merhaba, {profile.full_name?.split(' ')[0]}</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>Projelerin genel durumu ve sevkiyat planlaması.</p>
          </div>

          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={handleNotifClick}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.75rem',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--foreground)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--background)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '380px',
                maxHeight: '400px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={16} color="var(--primary)" /> Bildirimler
                  </h3>
                  <a href="/workshop" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    Tümünü Gör <ChevronRight size={12} />
                  </a>
                </div>

                <div style={{ padding: '0.5rem', overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                      Henüz bildirim yok.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '0.4rem',
                        background: notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        border: notif.is_read ? '1px solid transparent' : '1px solid rgba(59, 130, 246, 0.1)',
                        transition: 'background 0.2s',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: notif.type === 'task' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: notif.type === 'task' ? 'var(--primary)' : 'var(--muted-foreground)',
                          flexShrink: 0
                        }}>
                          {notif.type === 'task' ? <Clock size={16} /> : <Bell size={16} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: notif.is_read ? 'var(--foreground)' : 'var(--primary)' }}>
                              {notif.title || 'Yeni Bildirim'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                              {notif.created_at ? new Date(notif.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--foreground)', lineHeight: 1.4, opacity: notif.is_read ? 0.7 : 1 }}>
                            {notif.message || 'Bir bildirim aldınız.'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="card">
            <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '1rem' }}>
              <Activity size={24} />
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Toplam Proje</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{projects.length}</h3>
          </div>
          <div className="card">
            <div style={{ padding: '0.6rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '1rem' }}>
              <Clock size={24} />
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Aktif Projeler</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{projects.filter(p => p.status === 'Aktif').length}</h3>
          </div>
        </section>

        <section>
          <div className="header" style={{ marginBottom: '2.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Proje Listesi</h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
          ) : projects.length === 0 ? (
            <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ color: 'var(--muted-foreground)' }}>Henüz kayıtlı proje bulunamadı.</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(proj => (
                <div key={proj.id} className="card" style={{ position: 'relative', cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && handleOpenModal(proj)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <span className={`status-badge ${proj.status === 'Aktif' ? 'status-active' : 'status-pending'}`}>
                      {proj.status}
                    </span>
                    {isAdmin && <Edit3 size={16} color="var(--muted-foreground)" />}
                  </div>
                  <h4 className="card-title" style={{ marginBottom: '1.5rem', fontSize: '1.15rem' }}>{proj.name}</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                        <Calendar size={12} /> T. Başlangıç
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{proj.est_start ? new Date(proj.est_start).toLocaleDateString('tr-TR') : '-'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                        <Truck size={12} /> T. Sevkiyat
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4ade80' }}>{proj.est_shipment ? new Date(proj.est_shipment).toLocaleDateString('tr-TR') : '-'}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>İlerleme</span>
                    <span style={{ fontWeight: 700 }}>%{proj.progress || 0}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${proj.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 100%)', transition: 'width 0.8s ease' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={handleCloseModal}
        onProjectAdded={handleProjectAdded}
        initialData={editingProject}
        isAdmin={isAdmin}
        isMock={false}
      />
    </div >
  )
}
