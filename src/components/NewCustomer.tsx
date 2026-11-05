"use client";
import { useRouter } from "next/navigation";
import { CustomerForm } from "./CustomerForm";

export function NewCustomer() {
  const router = useRouter();
  return <CustomerForm onSaved={(id) => router.push(`/painel/clientes/${id}`)} />;
}
