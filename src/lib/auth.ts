/* Anthony.ia · camada de acesso
   ---------------------------------------------------------------
   Local-first por design: a sessão vive no navegador (localStorage)
   e a "verificação" de credenciais roda em transporte trocável —
   quando o servidor existir, basta apontar `AUTH_ENDPOINT` que o
   restante do app não muda uma linha. Estruturado para escalar:
   sessão com expiração, hash com salt e perfil por função. */

export const ROLES = [
  { id: "estagio", label: "Estágio em dados", level: "junior" as const },
  { id: "analista", label: "Analista de dados", level: "junior" as const },
  { id: "bi", label: "BI / Analytics", level: "pleno" as const },
  { id: "engenharia", label: "Engenharia de dados", level: "pleno" as const },
  { id: "cientista", label: "Cientista de dados", level: "senior" as const },
  { id: "gestao", label: "Gestão / Head de dados", level: "senior" as const },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export interface Session {
  name: string;
  email: string;
  role: RoleId;
  company: string;
  initials: string;
  loggedAt: number;
  remember: boolean;
}

const SESSION_KEY = "anthony.session";
const USERS_KEY = "anthony.users";
const TTL = 1000 * 60 * 60 * 12; // 12h sem "lembrar"
const TTL_REMEMBER = 1000 * 60 * 60 * 24 * 30; // 30 dias

/* ---- hash simples com salt (demo; no servidor: bcrypt/argon2) ---- */
export function hashSecret(email: string, secret: string): string {
  const src = `${email.toLowerCase()}::anthony.ia::${secret}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

/* ---- registro local de contas (para o modo demonstração) ---- */
interface StoredUser {
  name: string;
  email: string;
  role: RoleId;
  company: string;
  hash: string;
  createdAt: number;
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* seed da conta demo */
if (typeof localStorage !== "undefined") {
  const users = readUsers();
  if (!users.some((u) => u.email === "analista@anthony.ia")) {
    users.push({
      name: "Ana Ribeiro",
      email: "analista@anthony.ia",
      role: "analista",
      company: "Anthony Labs",
      hash: hashSecret("analista@anthony.ia", "demo1234"),
      createdAt: Date.now(),
    });
    writeUsers(users);
  }
}

/* ---- transporte (troque pelo fetch real quando houver servidor) ---- */
const AUTH_ENDPOINT: string | null = null; // ex.: "https://api.anthony.ia/v1/auth"

async function transportSignIn(email: string, secret: string): Promise<StoredUser | null> {
  if (AUTH_ENDPOINT) {
    const r = await fetch(`${AUTH_ENDPOINT}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, secret: hashSecret(email, secret) }),
    });
    return r.ok ? ((await r.json()) as StoredUser) : null;
  }
  /* modo local: confere contra o registro do navegador */
  await new Promise((res) => setTimeout(res, 750 + Math.random() * 350)); // latência perceptível
  const user = readUsers().find((u) => u.email === email.toLowerCase());
  if (!user || user.hash !== hashSecret(email, secret)) return null;
  return user;
}

/* ---- API pública ---- */

export function roleLabel(id: RoleId): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export function recommendedLevel(role: RoleId): "junior" | "pleno" | "senior" {
  return ROLES.find((r) => r.id === role)?.level ?? "junior";
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    const ttl = s.remember ? TTL_REMEMBER : TTL;
    if (Date.now() - s.loggedAt > ttl) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export async function signIn(
  email: string,
  secret: string,
  remember: boolean
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const user = await transportSignIn(email.trim(), secret);
  if (!user) {
    return { ok: false, error: "E-mail ou senha incorretos. Use o perfil demo se estiver testando." };
  }
  const session: Session = {
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    initials: initialsOf(user.name),
    loggedAt: Date.now(),
    remember,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export async function signUp(input: {
  name: string;
  email: string;
  secret: string;
  role: RoleId;
  company: string;
  remember: boolean;
}): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  await new Promise((res) => setTimeout(res, 800 + Math.random() * 300));
  const email = input.email.trim().toLowerCase();
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "Já existe uma conta com este e-mail — entre com ela." };
  }
  const user: StoredUser = {
    name: input.name.trim(),
    email,
    role: input.role,
    company: input.company.trim() || "—",
    hash: hashSecret(email, input.secret),
    createdAt: Date.now(),
  };
  users.push(user);
  writeUsers(users);
  const session: Session = {
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    initials: initialsOf(user.name),
    loggedAt: Date.now(),
    remember: input.remember,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/* ---- validação ---- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordScore(s: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let pts = 0;
  if (s.length >= 6) pts++;
  if (s.length >= 10) pts++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) pts++;
  if (/\d/.test(s)) pts++;
  if (/[^A-Za-z0-9]/.test(s)) pts++;
  const score = (s.length === 0 ? 0 : Math.min(4, Math.max(1, pts))) as 0 | 1 | 2 | 3 | 4;
  const map = {
    0: { label: "—", color: "var(--color-line2)" },
    1: { label: "fraca", color: "var(--color-coral)" },
    2: { label: "razoável", color: "var(--color-amber)" },
    3: { label: "forte", color: "var(--color-sky)" },
    4: { label: "excelente", color: "var(--color-teal)" },
  } as const;
  return { score, ...map[score] };
}
