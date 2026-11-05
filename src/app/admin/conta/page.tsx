import { PasswordForm } from "@/components/PasswordForm";
import { PageHeader } from "@/components/ui";

export default function AccountPage() {
  return (
    <div>
      <PageHeader title="Minha senha" subtitle="Use pelo menos 8 caracteres. Evite repetir senhas de outros sites." />
      <PasswordForm />
    </div>
  );
}
