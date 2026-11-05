import { PasswordForm } from "@/components/PasswordForm";

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Minha senha</h1>
      <PasswordForm />
    </div>
  );
}
