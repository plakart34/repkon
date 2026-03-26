'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, X, MessageSquare, User, Users, ChevronLeft, Search, Circle, Pin, Paperclip, Smile } from 'lucide-react'

export default function Chat({ profile }) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('genel') // 'genel' or 'kisiler'
    const [selectedUser, setSelectedUser] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('can_login', true)
            .neq('id', profile.id)
            .order('full_name')
        setUsers(data || [])
    }

    const fetchMessages = async () => {
        let query = supabase
            .from('chat_messages')
            .select('*, sender:profiles!sender_id(full_name)')
            .order('created_at', { ascending: true })

        if (selectedUser) {
            query = query.or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${profile.id})`)
        } else {
            query = query.is('receiver_id', null)
        }

        const { data, error } = await query.limit(100)
        if (!error) setMessages(data || [])
    }

    useEffect(() => {
        if (isOpen) {
            fetchUsers()
            fetchMessages()
            const channel = supabase
                .channel('chat_realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                    // Refresh messages
                    fetchMessages()
                    // If window is closed and message is for me, maybe show notification?
                })
                .subscribe()
            return () => supabase.removeChannel(channel)
        }
    }, [isOpen, selectedUser])

    useEffect(() => {
        if (isOpen) scrollToBottom()
    }, [messages, isOpen])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || loading) return
        setLoading(true)
        const { error } = await supabase.from('chat_messages').insert([{
            sender_id: profile.id,
            content: newMessage.trim(),
            receiver_id: selectedUser ? selectedUser.id : null
        }])
        setLoading(false)
        if (!error) {
            setNewMessage('')
            fetchMessages()
        } else {
            alert('Mesaj gönderilemedi: ' + error.message)
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [users, searchTerm])

    if (!profile) return null

    const glassBg = 'rgba(18, 18, 21, 0.9)'
    const accentColor = 'var(--primary)'

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999999, fontFamily: "'Outfit', sans-serif" }}>
            {/* Pulsing notification shadow for button if closed */}
            {!isOpen && (
                <div style={{
                    position: 'absolute', width: '64px', height: '64px',
                    borderRadius: '22px', background: accentColor,
                    opacity: 0.3, zIndex: -1, animation: 'pulse-ping 2s infinite'
                }} />
            )}

            {/* Improved Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '22px',
                    background: isOpen ? 'var(--secondary)' : accentColor,
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isOpen ? 'var(--shadow-lg)' : '0 12px 30px rgba(59, 130, 246, 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isOpen ? 'rotate(180deg) scale(0.9)' : 'scale(1)',
                }}
            >
                {isOpen ? <X size={28} /> : (
                    <div style={{ position: 'relative' }}>
                        <MessageSquare size={28} fill="currentColor" />
                        <span style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '18px', height: '18px', background: '#f43f5e',
                            borderRadius: '50%', border: '3px solid #09090b',
                            fontSize: '9px', fontWeight: 800, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>!</span>
                    </div>
                )}
            </button>

            {/* Chat Window Container */}
            {isOpen && (
                <div
                    className="animate-scale-in"
                    style={{
                        position: 'absolute',
                        bottom: '84px',
                        right: 0,
                        width: '420px',
                        height: '680px',
                        maxHeight: 'calc(100vh - 140px)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: glassBg,
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
                        borderRadius: '2.5rem',
                        overflow: 'hidden',
                        animation: 'chat-appear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.75rem',
                        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: selectedUser ? 0 : '1.5rem' }}>
                            {selectedUser ? (
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: 'none', color: 'white', cursor: 'pointer',
                                        width: '44px', height: '44px', borderRadius: '14px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                            ) : (
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '16px',
                                    background: 'linear-gradient(135deg, ' + accentColor + ' 0%, #1d4ed8 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 10px 20px rgba(59,130,246,0.3)',
                                    animation: 'bounce-light 2s infinite ease-in-out'
                                }}>
                                    <Users size={24} color="white" />
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    {selectedUser ? selectedUser.full_name : 'Ekip Sohbeti'}
                                    <span style={{ width: '10px', height: '10px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 10px #4ade8055' }} />
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, margin: '0.3rem 0 0' }}>
                                    {selectedUser ? (selectedUser.department || 'Çevrimiçi') : 'RMK Tracker Operasyon Hattı'}
                                </p>
                            </div>
                        </div>

                        {!selectedUser && (
                            <div style={{
                                display: 'flex', background: 'rgba(255,255,255,0.04)',
                                padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                {['genel', 'kisiler'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none',
                                            background: activeTab === tab ? accentColor : 'transparent',
                                            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                                            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {tab === 'genel' ? 'Genel Kanal' : 'Özel Mesaj'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Messages/Contacts Area */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {(selectedUser || activeTab === 'genel') ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    flex: 1, overflowY: 'auto', padding: '1.75rem',
                                    display: 'flex', flexDirection: 'column', gap: '1.5rem',
                                    scrollBehavior: 'smooth'
                                }} className="hide-scrollbar">
                                    {messages.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: '6rem' }}>
                                            <div style={{
                                                width: '70px', height: '70px', background: 'rgba(255,255,255,0.04)',
                                                borderRadius: '24px', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', margin: '0 auto 1.5rem',
                                                border: '1px solid rgba(255,255,255,0.06)'
                                            }}>
                                                <MessageSquare size={32} opacity={0.5} />
                                            </div>
                                            <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>İlk mesajı sen gönder!</p>
                                        </div>
                                    )}
                                    {messages.map((m, i) => {
                                        const isMe = m.sender_id === profile.id
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                                animation: `slide-up 0.3s ease-out forwards`
                                            }}>
                                                {!isMe && !selectedUser && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', marginLeft: '0.5rem' }}>{m.sender?.full_name}</span>
                                                )}
                                                <div style={{
                                                    maxWidth: '85%',
                                                    padding: '1rem 1.25rem',
                                                    borderRadius: isMe ? '1.5rem 1.5rem 0.6rem 1.5rem' : '1.5rem 1.5rem 1.5rem 0.6rem',
                                                    background: isMe ? 'linear-gradient(135deg, ' + accentColor + ' 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.06)',
                                                    border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    fontSize: '0.95rem',
                                                    lineHeight: '1.6',
                                                    boxShadow: isMe ? '0 10px 25px rgba(59,130,246,0.3)' : 'none',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {m.content}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                                                    marginTop: '0.5rem', fontWeight: 600,
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                }}>
                                                    {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    {isMe && <span style={{ color: '#4ade80', fontSize: '10px' }}>✓✓</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div style={{ padding: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
                                    <form onSubmit={handleSend} style={{
                                        display: 'flex', gap: '0.75rem', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.05)', padding: '8px',
                                        borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.08)',
                                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                                    }}>
                                        <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', padding: '0.75rem', cursor: 'pointer' }}><Smile size={22} /></button>
                                        <input
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Mesaj yaz..."
                                            style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontSize: '1rem', outline: 'none', padding: '0.5rem 0' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || loading}
                                            style={{
                                                width: '48px', height: '48px', borderRadius: '16px',
                                                background: newMessage.trim() ? 'linear-gradient(135deg, ' + accentColor + ' 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.06)',
                                                border: 'none', color: 'white', cursor: 'pointer', transition: 'all 0.3s ease',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: newMessage.trim() ? '0 5px 15px rgba(59,130,246,0.3)' : 'none',
                                                transform: newMessage.trim() ? 'scale(1)' : 'scale(0.95)'
                                            }}
                                        >
                                            <Send size={20} fill={newMessage.trim() ? 'currentColor' : 'none'} style={{ marginLeft: '2px' }} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '1.5rem 1.75rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                        <input
                                            placeholder="Ekipte birini ara..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%', padding: '1rem 1.25rem 1rem 3.25rem',
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '1.25rem', fontSize: '1rem', color: 'white', outline: 'none',
                                                transition: 'all 0.3s'
                                            }}
                                            onFocus={e => e.target.style.borderColor = accentColor}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                                        />
                                    </div>
                                </div>
                                <div style={{
                                    flex: 1, overflowY: 'auto', padding: '0 0.75rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.25rem'
                                }}>
                                    {filteredUsers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => setSelectedUser(user)}
                                            style={{
                                                padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem',
                                                cursor: 'pointer', borderRadius: '1.5rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                margin: '0.25rem 0.5rem', border: '1px solid transparent'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                                                e.currentTarget.style.transform = 'translateX(5px)'
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent'
                                                e.currentTarget.style.borderColor = 'transparent'
                                                e.currentTarget.style.transform = 'translateX(0)'
                                            }}
                                        >
                                            <div style={{
                                                width: '56px', height: '56px', borderRadius: '18px',
                                                background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(168,85,247,0.15) 100%)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 800, fontSize: '1.2rem',
                                                boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                                            }}>
                                                {user.full_name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{user.full_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{user.department || 'Operasyon Birimi'}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade8066' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
