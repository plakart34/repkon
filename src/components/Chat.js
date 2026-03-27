'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, X, MessageSquare, User, Users, ChevronLeft, Search, Circle, Pin, Paperclip, Smile, ChevronUp, ChevronDown } from 'lucide-react'

export default function Chat({ profile }) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('genel') // 'genel' or 'kisiler'
    const [selectedUser, setSelectedUser] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)
    const [unreadUsers, setUnreadUsers] = useState([]) // TRACK UNREAD USER IDs
    const [lastReadTime, setLastReadTime] = useState(Date.now())
    const messagesEndRef = useRef(null)
    const notificationSound = useRef(null)
    const scrollRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const scrollUp = () => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }

    const scrollDown = () => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
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
            .select('*, sender:profiles!sender_id(full_name, email)')
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
        fetchUsers()
        fetchMessages()

        const channel = supabase
            .channel('chat_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                const isForMe = !payload.new.receiver_id || payload.new.receiver_id === profile.id
                const isFromMe = payload.new.sender_id === profile.id

                if (isForMe && !isFromMe) {
                    if (notificationSound.current) {
                        notificationSound.current.currentTime = 0
                        notificationSound.current.play().catch(() => { })
                    }
                    if (!isOpen) setUnreadCount(prev => prev + 1)

                    // IF IT'S A PRIVATE MESSAGE AND THAT USER ISN'T SELECTED, ADD TO UNREAD USERS
                    if (payload.new.receiver_id && (!selectedUser || selectedUser.id !== payload.new.sender_id)) {
                        setUnreadUsers(prev => Array.from(new Set([...prev, payload.new.sender_id])))
                    }
                }
                if (isOpen) fetchMessages()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [profile.id])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setUnreadCount(0)
            setLastReadTime(Date.now())
            scrollToBottom()
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen, messages.length])

    useEffect(() => {
        if (isOpen) fetchMessages()
        // CLEAR UNREAD FLAG FOR SELECTED USER
        if (selectedUser) {
            setUnreadUsers(prev => prev.filter(id => id !== selectedUser.id))
        }
    }, [selectedUser])

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
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [users, searchTerm])

    if (!profile) return null

    const glassBg = 'rgba(18, 18, 21, 0.95)'
    const accentColor = 'var(--primary)'

    return (
        <>
            <audio ref={notificationSound} src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" preload="auto" />

            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999999, fontFamily: "'Outfit', sans-serif" }}>
                {!isOpen && (
                    <div style={{
                        position: 'absolute', width: '64px', height: '64px',
                        borderRadius: '22px', background: accentColor,
                        opacity: 0.3, zIndex: -1, animation: 'pulse-ping 2s infinite'
                    }} />
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '64px', height: '64px', borderRadius: '22px',
                        background: isOpen ? 'var(--secondary)' : accentColor,
                        color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isOpen ? 'var(--shadow-lg)' : '0 12px 30px rgba(59, 130, 246, 0.5)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {isOpen ? <X size={28} /> : (
                        <div style={{ position: 'relative' }}>
                            <MessageSquare size={28} fill="currentColor" />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-8px', right: '-8px',
                                    minWidth: '22px', height: '22px', background: '#ef4444',
                                    borderRadius: '50%', border: '2px solid #09090b',
                                    fontSize: '11px', fontWeight: 900, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 4px', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
                                }}>{unreadCount}</span>
                            )}
                        </div>
                    )}
                </button>
            </div>

            {isOpen && (
                <div
                    className="animate-scale-in"
                    style={{
                        position: 'fixed', bottom: '100px', right: '2rem',
                        zIndex: 9999999, width: '420px', height: '820px',
                        maxHeight: 'calc(100vh - 120px)', display: 'grid',
                        gridTemplateRows: 'auto 1fr auto', background: glassBg,
                        backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
                        borderRadius: '2.5rem', overflow: 'hidden',
                        animation: 'chat-appear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        overscrollBehavior: 'contain', fontFamily: "'Outfit', sans-serif"
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: selectedUser ? 0 : '1.25rem' }}>
                            {selectedUser ? (
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)', border: 'none',
                                        color: 'white', cursor: 'pointer', width: '36px', height: '36px',
                                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            ) : (
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, ' + accentColor + ' 0%, #1d4ed8 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Users size={20} color="white" />
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {selectedUser ? selectedUser.full_name : 'Ekip Sohbeti'}
                                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, margin: '0.2rem 0 0' }}>
                                    {selectedUser ? (selectedUser.department || 'Çevrimiçi') : 'RMK Tracker Operasyon Hattı'}
                                </p>
                            </div>
                        </div>

                        {!selectedUser && (
                            <div style={{
                                display: 'flex', background: 'rgba(255,255,255,0.04)',
                                padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                {['genel', 'kisiler'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            flex: 1, padding: '0.6rem', borderRadius: '10px',
                                            background: activeTab === tab ? accentColor : 'transparent',
                                            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none'
                                        }}
                                    >
                                        {tab === 'genel' ? 'Genel Kanal' : 'Özel Mesaj'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {(selectedUser || activeTab === 'genel') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                {/* Scroll Buttons Layer */}
                                <div style={{
                                    position: 'absolute', right: '1.25rem', bottom: '1.5rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 100
                                }}>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollUp(); }}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollDown(); }}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                <div
                                    ref={scrollRef}
                                    style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
                                >
                                    {messages.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: '5rem' }}>
                                            <MessageSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                            <p style={{ fontSize: '0.8rem' }}>Henüz mesaj yok</p>
                                        </div>
                                    )}
                                    {messages.map((m) => {
                                        const isMe = m.sender_id === profile.id || m.sender?.email === profile.email
                                        return (
                                            <div
                                                key={m.id}
                                                style={{
                                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                    maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '0.3rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                                                        {isMe ? 'Sen' : m.sender?.full_name}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    padding: '0.6rem 0.85rem',
                                                    background: isMe ? 'linear-gradient(135deg, ' + accentColor + ' 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.06)',
                                                    borderRadius: isMe ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'white', fontSize: '13px', lineHeight: '1.4'
                                                }}>
                                                    {m.content}
                                                </div>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: isMe ? 'right' : 'left' }}>
                                                    {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                <div style={{ padding: '1rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                        <input
                                            placeholder="Ekipte ara..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '12px', fontSize: '0.8rem', color: 'white', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div
                                    ref={scrollRef}
                                    style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                                >
                                    {/* Contacts Scroll Buttons */}
                                    <div style={{
                                        position: 'absolute', right: '1.25rem', bottom: '1.25rem',
                                        display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 100
                                    }}>
                                        <button onClick={scrollUp} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(30,30,30,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronUp size={16} /></button>
                                        <button onClick={scrollDown} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(30,30,30,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronDown size={16} /></button>
                                    </div>

                                    {filteredUsers.map(user => {
                                        const isUnread = unreadUsers.includes(user.id)
                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => setSelectedUser(user)}
                                                style={{
                                                    padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                                    cursor: 'pointer', borderRadius: '1rem', transition: 'all 0.2s',
                                                    background: isUnread ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                                    borderLeft: isUnread ? '3px solid #ef4444' : '3px solid transparent',
                                                    boxShadow: isUnread ? '0 0 15px rgba(239, 68, 68, 0.05)' : 'none'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = isUnread ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(239, 68, 68, 0.08)' : 'transparent'}
                                            >
                                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isUnread ? '#ef4444' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white' }}>
                                                    {user.full_name?.charAt(0)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isUnread ? '#ef4444' : 'white' }}>
                                                        {user.full_name}
                                                        {isUnread && <span style={{ marginLeft: '8px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #ef4444' }} />}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: isUnread ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.4)' }}>{user.department || 'Operasyon'}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {(selectedUser || activeTab === 'genel') && (
                        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
                            <form onSubmit={handleSend} style={{
                                display: 'flex', gap: '0.5rem', alignItems: 'center',
                                background: 'rgba(255,255,255,0.04)', padding: '6px',
                                borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <input
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Mesaj..."
                                    style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', padding: '0.5rem 0.25rem' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || loading}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '12px',
                                        background: newMessage.trim() ? accentColor : 'rgba(255,255,255,0.06)',
                                        border: 'none', color: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
