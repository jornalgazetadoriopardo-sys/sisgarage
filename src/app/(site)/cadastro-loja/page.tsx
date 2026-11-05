import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = { title: "Cadastre sua loja" };

export default function SignupPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Anuncie seu estoque no SisGarage</h1>
        <ul className="mt-6 space-y-3 text-slate-700">
          <li>✓ Vitrine própria da loja, com link para divulgar</li>
          <li>✓ Contatos dos compradores direto no seu WhatsApp e no painel</li>
          <li>✓ Gestão do estoque com fotos, opcionais e status</li>
          <li>✓ Em breve: custos, documentação, FIPE, recibos, financeiro e agenda</li>
        </ul>
        <p className="mt-8 text-sm text-slate-500">
          Já tem conta? <Link href="/entrar" className="font-semibold text-brand-600 hover:underline">Entrar</Link>
        </p>
      </div>
      <div className="card p-8">
        <SignupForm />
      </div>
    </div>
  );
}
