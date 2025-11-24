import z from "zod"
import axios from 'axios'
import { toast } from 'sonner'

export const formSchema = z.object({
    email: z.email(),
    password: z.string().min(2, 'A senha deve ter pelo menos 2 caracteres'),
})

const getSubdomain = () => {
    const host = window.location.hostname
    const parts = host.split('.')
    // Em ambiente de desenvolvimento, padronizar para 'localhost' (mesmo para 127.x.x.x)
    if (host === 'localhost' || /^127(\.\d+){0,3}$/.test(host)) {
        return 'localhost'
    }
    // Em produção, usa o primeiro label como subdomínio
    return parts[0] ?? host
}

const getToken = () => {
    // Tenta chave preferencial e fallbacks (inclui 'local' para compatibilidade)
    const keys = [
        `${getSubdomain()}-directa-authToken`,
        'localhost-directa-authToken',
        '127.0.0.1-directa-authToken',
        'local-directa-authToken',
        // Fallback para chaves antigas
        `${getSubdomain()}-kayla-authToken`,
        'localhost-kayla-authToken',
        '127.0.0.1-kayla-authToken',
        'local-kayla-authToken',
    ]
    for (const key of keys) {
        const token = localStorage.getItem(key)
        if (token) return token
    }
    return null
}

const publicInstance = axios.create({
    baseURL: "https://x8ki-letl-twmt.n7.xano.io",
    headers: {
        "Content-Type": "application/json",
    },
})

const loginInstance = axios.create({
    baseURL: "https://x8ki-letl-twmt.n7.xano.io",
    headers: {
        "Content-Type": "application/json",
    },
})

export const loginResponseSchema = z.object({
    authToken: z.string().refine((t) => t.split('.').length >= 3, { message: 'Token inválido' }),
    user: z.object({
        id: z.number().int(),
        created_at: z.union([z.number().int(), z.string()]),
        name: z.string().min(1),
        email: z.string().email(),
        company_id: z.number().int(),
        profile: z.string().min(1),
    }),
})

loginInstance.interceptors.response.use((response) => {
    if (response.status === 200) {
        const parsed = loginResponseSchema.safeParse(response.data)
        if (!parsed.success) {
            throw new Error('Resposta de login fora do formato especificado')
        }
        const { authToken, user } = parsed.data
        try {
            normalizeTokenStorage(authToken)
        } catch {
            localStorage.setItem(`${getSubdomain()}-directa-authToken`, authToken)
        }
        localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(user))
        try {
            const avatarUrl = (user as any)?.image?.url ?? (user as any)?.avatar_url ?? null
            window.dispatchEvent(new CustomEvent('directa:user-updated', {
                detail: { name: user?.name, email: user?.email, avatarUrl }
            }))
        } catch { }
    }
    return response
}, (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message
    if (status === 401 || status === 403) {
        toast.error('Credenciais inválidas', { description: 'Email ou senha incorretos.' })
    } else if (message === 'Unable to locate request.') {
        toast.error('Falha no login', { description: 'Serviço indisponível ou rota inválida.' })
    } else {
        toast.error('Erro ao efetuar login')
    }
    return Promise.reject(error)
})

const privateInstance = axios.create({
    baseURL: "https://x8ki-letl-twmt.n7.xano.io",
})

privateInstance.interceptors.request.use((config) => {
    // Preserve existing Content-Type if already set (e.g., multipart/form-data for file uploads)
    if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json'
    }
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }

    // Validação global de paginação (per_page): mínimo 20, máximo 100, padrão 20
    try {
        const method = (config.method || 'get').toLowerCase()
        const isListRequest = method === 'get'
        if (isListRequest) {
            const params = { ...(config.params || {}) }
            let perPage = params.per_page ?? 20
            if (typeof perPage !== 'number') perPage = Number(perPage)
            if (!Number.isFinite(perPage) || Number.isNaN(perPage)) perPage = 20
            if (perPage < 20 || perPage > 100) {
                const error = new Error('per_page must be between 20 and 100') as any
                error.response = { status: 400, data: { message: 'per_page must be between 20 e 100' } }
                throw error
            }
            params.per_page = perPage
            config.params = params
        }
    } catch (e) {
        throw e
    }
    return config
})

// Intercepta respostas para tratar 401 e 403
privateInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            // Redireciona para a tela de login ao detectar sessão inválida
            try { toast.dismiss() } catch {}
            try {
                window.location.href = '/sign-in'
            } catch {}
        }
        
        return Promise.reject(error)
    }
)

export const auth = {
    // Normaliza o armazenamento do token: grava na chave preferida e remove chaves antigas de dev
    normalizeTokenStorage: (token: string) => normalizeTokenStorage(token),
    login: async (values: z.infer<typeof formSchema>) => {
        const sub = getSubdomain()
        let companyId: number | null = null
        try {
            const raw = localStorage.getItem(`${sub}-directa-company`)
            if (raw) {
                const obj = JSON.parse(raw)
                companyId = obj?.id ?? null
            }
        } catch { }

        if (companyId == null) {
            try {
                const resp = await axios.get('https://x8ki-letl-twmt.n7.xano.io/api:DUnPTQkM/company', { params: { alias: sub } })
                if (resp.status === 200 && resp.data?.id) {
                    companyId = resp.data.id
                    try { localStorage.setItem(`${sub}-directa-company`, JSON.stringify(resp.data)) } catch { }
                }
            } catch { }
        }

        if (companyId == null) {
            toast.error('Não foi possível identificar a empresa', { description: 'Verifique o subdomínio e tente novamente.' })
            return Promise.reject(new Error('missing company_id'))
        }

        const payload = { ...values, company_id: companyId }
        return loginInstance.post(`/api:aHWQkL67/auth/login`, payload)
    },
    getCompany: async () => {
        // Usar o servidor n7 para companies
        const response = await publicInstance.get(`/api:kdrFy_tm/companies/${getSubdomain()}`)
        if (response.status === 200) {
            localStorage.setItem(`${getSubdomain()}-directa-company`, JSON.stringify(response.data))
            return { status: response.status, data: response.data }
        }
        return { status: response.status, data: null }
    },
    
    // Guard específico para rotas do dashboard (/dashboard/**)
    dashboardGuard: async () => {
        const authToken = getToken()
        if (!authToken) {
            return
        }
        return
    }
}

// Exportar instâncias n7 para uso em páginas que manipulam companies
export { publicInstance, privateInstance }

// Helpers privados
function normalizeTokenStorage(token: string) {
    const preferredKey = `${getSubdomain()}-directa-authToken`
    localStorage.setItem(preferredKey, token)
    // Remove chaves antigas de desenvolvimento
    try { localStorage.removeItem('local-kayla-authToken') } catch {}
    try { localStorage.removeItem('127.0.0.1-kayla-authToken') } catch {}
}
