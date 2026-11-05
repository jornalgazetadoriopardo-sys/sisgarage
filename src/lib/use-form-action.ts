"use client";
import { startTransition, useActionState, type FormEvent } from "react";
import { initialState, type ActionState } from "./action-state";
import { MAX_SEND_BYTES, shrinkForUpload } from "./image-shrink";

/**
 * Como useActionState, mas:
 * - sem o reset automático do formulário (em caso de erro o usuário não perde o que digitou);
 * - reduz imagens grandes antes de enviar (limite de envio da Vercel).
 */
export function useFormAction(
  fn: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    for (const [key, value] of [...formData.entries()]) {
      if (value instanceof File && value.size > 0) {
        const small = await shrinkForUpload(value);
        if (small.size > MAX_SEND_BYTES) return { error: `Arquivo muito grande: ${value.name} (máx. 4 MB).` };
        if (small !== value) formData.set(key, small);
      }
    }
    return fn(prev, formData);
  }, initialState);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };
  return { state, onSubmit, pending };
}
