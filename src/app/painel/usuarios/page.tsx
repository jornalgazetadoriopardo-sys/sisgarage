import { requireStoreOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleStaffUser } from "@/app/actions/store";
import { StaffForm } from "@/components/StaffForm";
import { PageHeader } from "@/components/ui";

export default async function UsersPage() {
  const { storeId, user: me } = await requireStoreOwner();
  const users = await prisma.user.findMany({ where: { storeId }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-8">
      <PageHeader title="Usuários da loja" subtitle="Vendedores cadastram veículos, cuidam da documentação e veem os contatos. Custos, lucro e configurações são só do dono." />
      <ul className="card divide-y divide-slate-100">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{u.name} {u.id === me.id && <span className="text-xs text-slate-400">(você)</span>}</p>
              <p className="text-sm text-slate-500">{u.email} · {u.role === "STORE_OWNER" ? "Dono" : "Vendedor"}{!u.active && " · desativado"}</p>
            </div>
            {u.role === "STORE_STAFF" && (
              <form action={toggleStaffUser}>
                <input type="hidden" name="id" value={u.id} />
                <button className={u.active ? "btn-secondary" : "btn-primary"}>{u.active ? "Desativar" : "Reativar"}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <StaffForm />
    </div>
  );
}
