'use client'

// Mock storage for local development before Supabase is connected
const isBrowser = typeof window !== 'undefined'

const getInitialData = (key, defaultValue) => {
    if (!isBrowser) return defaultValue
    const saved = localStorage.getItem(key)
    try {
        return saved ? JSON.parse(saved) : defaultValue
    } catch (e) {
        return defaultValue
    }
}

const saveData = (key, data) => {
    if (isBrowser) {
        localStorage.setItem(key, JSON.stringify(data))
    }
}

// Initial Roles
const defaultRoles = [
    {
        id: '1',
        name: 'Admin',
        description: 'Tam yetkili yönetici',
        permissions: [
            'view_dashboard', 'view_projects', 'create_project', 'edit_project',
            'view_workshop', 'manage_workshop', 'update_status', 'view_tasks',
            'view_team', 'manage_team', 'view_logs'
        ]
    }
]

// Default Admin User
const defaultAdminUser = {
    id: 'admin_1',
    email: 'admin@repkon.com.tr',
    password: 'admin543675',
    full_name: 'Sistem Yöneticisi',
    role_id: '1',
    department: 'Yönetim',
    can_login: true,
    is_approved: true
}

export const storage = {
    getRoles: () => {
        let roles = getInitialData('rmk_roles', defaultRoles)
        // Eğer roller içinde eski formatta route yetkileri varsa (Örn: "/") veya default roller hala duruyorsa, Admin dışındakileri sil veya resetle.
        if (roles.length > 0 && roles.some(r => r.permissions && r.permissions.includes('/'))) {
            const adminParams = defaultRoles[0]
            roles = [adminParams]
            saveData('rmk_roles', roles)
        }
        return roles
    },
    saveRole: (role) => {
        const roles = storage.getRoles()
        const index = roles.findIndex(r => r.id === role.id)
        if (index !== -1) {
            roles[index] = role
        } else {
            roles.push({ ...role, id: Date.now().toString() })
        }
        saveData('rmk_roles', roles)
        return role
    },

    deleteRole: (id) => {
        let roles = storage.getRoles()
        roles = roles.filter(r => r.id !== id)
        saveData('rmk_roles', roles)
    },

    getDepartments: () => getInitialData('rmk_departments', ['Yönetim']),
    saveDepartment: (deptName) => {
        const depts = storage.getDepartments()
        if (!depts.includes(deptName)) {
            depts.push(deptName)
            saveData('rmk_departments', depts)
        }
        return deptName
    },

    updateDepartment: (oldName, newName) => {
        let depts = storage.getDepartments()
        const index = depts.indexOf(oldName)
        if (index !== -1) {
            depts[index] = newName
            saveData('rmk_departments', depts)

            let profiles = storage.getProfiles()
            profiles = profiles.map(p => p.department === oldName ? { ...p, department: newName } : p)
            saveData('rmk_profiles', profiles)
        }
    },

    deleteDepartment: (deptName) => {
        let depts = storage.getDepartments()
        depts = depts.filter(d => d !== deptName)
        saveData('rmk_departments', depts)
    },

    getProfiles: () => {
        let profiles = getInitialData('rmk_profiles', [defaultAdminUser])
        if (!profiles.some(p => p.email === 'admin@repkon.com.tr')) {
            profiles.push(defaultAdminUser)
            saveData('rmk_profiles', profiles)
        }
        return profiles
    },

    saveProfile: (profile) => {
        const profiles = storage.getProfiles()
        const index = profiles.findIndex(p => p.id === profile.id)
        if (index !== -1) {
            profiles[index] = profile
        } else {
            profiles.push({ ...profile, id: profile.id || Date.now().toString() })
        }
        saveData('rmk_profiles', profiles)
        return profile
    },

    deleteProfile: (id) => {
        let profiles = storage.getProfiles()
        profiles = profiles.filter(p => p.id !== id)
        saveData('rmk_profiles', profiles)
    },

    getProjects: () => getInitialData('rmk_projects', []),
    saveProject: (project) => {
        const projects = storage.getProjects()
        const newProject = { ...project, id: Date.now().toString(), created_at: new Date().toISOString() }
        projects.push(newProject)
        saveData('rmk_projects', projects)
        return newProject
    },
    updateProject: (project) => {
        const projects = storage.getProjects()
        const index = projects.findIndex(p => p.id === project.id)
        if (index !== -1) {
            projects[index] = { ...projects[index], ...project }
            saveData('rmk_projects', projects)
            return projects[index]
        }
        return null
    },
    deleteProject: (id) => {
        let projects = storage.getProjects()
        projects = projects.filter(p => p.id !== id)
        saveData('rmk_projects', projects)

        let machines = storage.getMachines()
        machines = machines.filter(m => m.projectId !== id)
        saveData('rmk_machines', machines)
    },

    getTasks: () => getInitialData('rmk_tasks', []),
    saveTask: (task) => {
        const tasks = storage.getTasks()
        const newTask = { ...task, id: Date.now().toString(), created_at: new Date().toISOString() }
        tasks.push(newTask)
        saveData('rmk_tasks', tasks)
        return newTask
    },

    getMachines: (projectId = null) => {
        const machines = getInitialData('rmk_machines', [])
        if (projectId) {
            return machines.filter(m => m.projectId === projectId)
        }
        return machines
    },
    saveMachine: (machine) => {
        const machines = storage.getMachines()
        const newMachine = { ...machine, id: Date.now().toString(), created_at: new Date().toISOString() }
        machines.push(newMachine)
        saveData('rmk_machines', machines)
        return newMachine
    },
    updateMachine: (machine) => {
        const machines = storage.getMachines()
        const index = machines.findIndex(m => m.id === machine.id)
        if (index !== -1) {
            machines[index] = { ...machines[index], ...machine }
            saveData('rmk_machines', machines)
            return machines[index]
        }
        return null
    },
    deleteMachine: (machineId) => {
        let machines = storage.getMachines()
        machines = machines.filter(m => m.id !== machineId)
        saveData('rmk_machines', machines)
    },

    getBOM: (machineId, type) => {
        const bomData = getInitialData(`rmk_bom_${machineId}_${type}`, [])
        return bomData
    },
    saveBOMItem: (machineId, type, item) => {
        const bomItems = storage.getBOM(machineId, type)
        const newItem = { ...item, id: Date.now().toString() }
        bomItems.push(newItem)
        saveData(`rmk_bom_${machineId}_${type}`, bomItems)
        return newItem
    },

    getOperations: () => getInitialData('rmk_operations', []),

    saveOperation: (op) => {
        const ops = storage.getOperations()
        const orderNumber = (ops.length + 1001).toString()
        const newOp = {
            ...op,
            id: Date.now().toString(),
            orderId: `RMK-${orderNumber}`,
            status: 'Bekliyor',
            history: [{
                status: 'Bekliyor',
                note: 'Yapılacak İş Emri Oluşturuldu',
                timestamp: new Date().toISOString(),
                user: op.userName
            }],
            timestamp: new Date().toISOString()
        }
        ops.push(newOp)
        saveData('rmk_operations', ops)
        return newOp
    },

    updateOperationStatus: (opId, newStatus, note, userName) => {
        const ops = storage.getOperations()
        const index = ops.findIndex(o => o.id === opId)
        if (index !== -1) {
            ops[index].status = newStatus
            // Safeguard for history
            if (!ops[index].history) ops[index].history = []

            ops[index].history.push({
                status: newStatus,
                note: note || 'Statü güncellendi.',
                timestamp: new Date().toISOString(),
                user: userName
            })
            saveData('rmk_operations', ops)
            return ops[index]
        }
        return null
    },

    updateOperation: (op) => {
        const ops = storage.getOperations()
        const index = ops.findIndex(o => o.id === op.id)
        if (index !== -1) {
            ops[index] = { ...ops[index], ...op }
            saveData('rmk_operations', ops)
            return ops[index]
        }
        return null
    },

    deleteOperation: (id) => {
        let ops = storage.getOperations()
        ops = ops.filter(o => o.id !== id)
        saveData('rmk_operations', ops)
    },

    login: (email, password) => {
        const profiles = storage.getProfiles()
        const user = profiles.find(p => p.email === email && p.password === password && p.can_login)
        if (user) {
            if (isBrowser) localStorage.setItem('rmk_session_email', email)
            return user
        }
        return null
    },

    logout: () => {
        if (isBrowser) localStorage.removeItem('rmk_session_email')
    },

    getCurrentUser: () => {
        const email = isBrowser ? localStorage.getItem('rmk_session_email') : null
        if (!email) return null
        return storage.getProfiles().find(p => p.email === email)
    }
}
