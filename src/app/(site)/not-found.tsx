import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-slate-500">O veículo pode ter sido vendido ou removido.</p>
      <Link href="/veiculos" className="btn-primary mt-6">Ver veículos disponíveis</Link>
    </div>
  );
}
