"use client";
import { startTransition, useActionState, type FormEvent } from "react";
import { initialState, type ActionState } from "./action-state";

/**
 * Como useActionState, mas sem o reset automático do formulário que o React 19
 * faz ao usar <form action>. Assim, em caso de erro de validação, o usuário não
 * perde o que digitou.
 */
export function useFormAction(fn: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, action, pending] = useActionState(fn, initialState);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };
  return { state, onSubmit, pending };
}
