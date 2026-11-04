import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold">Entrar</h1>
        <p className="mb-6 text-sm text-slate-500">Acesso ao painel da loja.</p>
        <LoginForm next={next} />
        <p className="mt-6 text-center text-sm text-slate-600">
          Ainda não tem conta? <Link href="/cadastro-loja" className="font-semibold text-brand-600 hover:underline">Cadastre sua loja</Link>
        </p>
      </div>
    </div>
  );
}
