import type { z } from "zod";

export type ActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** id do registro criado, quando a ação cria algo */
  id?: string;
};

export const initialState: ActionState = {};

export function zodErrors(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Verifique os campos destacados.", fieldErrors };
}
