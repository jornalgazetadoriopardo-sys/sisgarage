import { requireStoreOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleStaffUser } from "@/app/actions/store";
import { StaffForm } from "@/components/StaffForm";

export default async function UsersPage() {
  const { storeId, user: me } = await requireStoreOwner();
  const users = await prisma.user.findMany({ where: { storeId }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Usuários da loja</h1>
      <p className="text-sm text-slate-500">Funcionários podem cadastrar e editar veículos e ver os contatos. Apenas o dono altera dados da loja e usuários.</p>
      <ul className="card divide-y divide-slate-100">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{u.name} {u.id === me.id && <span className="text-xs text-slate-400">(você)</span>}</p>
              <p className="text-sm text-slate-500">{u.email} · {u.role === "STORE_OWNER" ? "Dono" : "Funcionário"}</p>
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
