import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function usePermissions() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()

    const checkUser = useCallback(async () => {
        if (typeof window === 'undefined') return

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                if (pathname !== '/login') {
                    router.replace('/login')
                }
                setLoading(false)
                return
            }

            // Fetch profile and join role
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*, roles(*)')
                .eq('id', user.id)
                .single()

            if (profileError || !profileData) {
                console.error('Profile error:', profileError)
                setLoading(false)
                return
            }

            // Supabase returns roles as an object if joined
            const role = profileData.roles
            const profileWithRole = { ...user, ...profileData, roles: role }

            if (!profile || profile.id !== user.id) {
                setProfile(profileWithRole)
            }

            const allowedPaths = role?.permissions || []
            const isAdmin = role?.name === 'Admin'

            const getPermissionKey = (path) => {
                if (path === '/') return 'view_dashboard'
                if (path.startsWith('/projects')) return 'view_projects'
                if (path.startsWith('/workshop')) return 'view_workshop'
                if (path.startsWith('/tasks')) return 'view_tasks'
                if (path.startsWith('/logs')) return 'view_logs'
                if (path.startsWith('/team')) return 'view_team'
                return null
            }

            const currentKey = getPermissionKey(pathname)
            const isAllowed = isAdmin || (currentKey && allowedPaths.includes(currentKey))

            if (!isAllowed && pathname !== '/unauthorized' && pathname !== '/login') {
                router.replace('/unauthorized')
            }

            if (pathname === '/login' && user) {
                router.replace('/')
            }
        } catch (error) {
            console.error('Auth check error:', error)
        } finally {
            setLoading(false)
        }
    }, [pathname, router, profile])

    useEffect(() => {
        checkUser()
    }, [pathname, checkUser])

    return { profile, loading }
}
