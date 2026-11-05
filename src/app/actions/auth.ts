"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { onlyDigits, slugify } from "@/lib/format";
import { BR_STATES } from "@/lib/labels";
import { zodErrors, type ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

const LOCK_MINUTES = 15;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim().slice(0, 64);
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, password, next } = parsed.data;

  // Limite de tentativas gravado no banco (por e-mail e por IP), não por sessão.
  const ip = await clientIp();
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  if (byEmail >= MAX_FAILS_PER_EMAIL || byIp >= MAX_FAILS_PER_IP) {
    return { error: `Muitas tentativas sem sucesso. Aguarde ${LOCK_MINUTES} minutos e tente de novo.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = Boolean(user && user.active && (await verifyPassword(password, user.passwordHash)));
  await prisma.loginAttempt.create({ data: { email, ip, success: ok } });
  if (!ok || !user) return { error: "E-mail ou senha incorretos." };

  // limpeza: tentativas antigas e falhas anteriores deste e-mail
  await prisma.loginAttempt.deleteMany({
    where: { OR: [{ createdAt: { lt: new Date(Date.now() - 86_400_000) } }, { email, success: false }] },
  });
  await createSession(user);

  const home = user.role === "SUPER_ADMIN" ? "/admin" : "/painel";
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : home;
  redirect(safeNext);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const signupSchema = z.object({
  storeName: z.string().trim().min(2, "Informe o nome da loja").max(100),
  cnpj: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos"),
  phone: z.string().trim().min(10, "Informe o telefone com DDD").max(20),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.enum(BR_STATES, { message: "Selecione o estado" }),
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

async function uniqueSlug(base: string) {
  const root = slugify(base) || "loja";
  let slug = root;
  for (let i = 2; await prisma.store.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${root}-${i}`;
  }
  return slug;
}

export async function signupStore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { error: "Já existe uma conta com este e-mail.", fieldErrors: { email: "E-mail já cadastrado" } };
  }
  if (d.cnpj && (await prisma.store.findUnique({ where: { cnpj: d.cnpj } }))) {
    return { error: "Já existe uma loja com este CNPJ.", fieldErrors: { cnpj: "CNPJ já cadastrado" } };
  }

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: "STORE_OWNER",
      store: {
        create: {
          name: d.storeName,
          slug: await uniqueSlug(d.storeName),
          cnpj: d.cnpj || null,
          email: d.email,
          phone: d.phone,
          whatsapp: d.phone,
          city: d.city,
          state: d.state,
        },
      },
    },
  });
  await createSession(user);
  redirect("/painel?bemvindo=1");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual"),
    password: z.string().min(8, "A nova senha precisa ter ao menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { error: "Senha atual incorreta.", fieldErrors: { current: "Senha atual incorreta" } };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return { message: "Senha alterada." };
}
