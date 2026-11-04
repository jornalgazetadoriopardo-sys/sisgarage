"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { onlyDigits, slugify } from "@/lib/format";
import { BR_STATES } from "@/lib/labels";
import { zodErrors, type ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, password, next } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
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
