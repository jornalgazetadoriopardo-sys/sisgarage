"use client";
import { useEffect, useRef } from "react";
import Sortable from "sortablejs";

/**
 * Arrastar e soltar (mouse e toque) com SortableJS.
 * Chama onReorder com a nova lista de ids (atributo data-id dos filhos).
 */
export function useSortable<T extends HTMLElement>(onReorder: (ids: string[]) => void, options: { disabled?: boolean; handle?: string } = {}) {
  const ref = useRef<T>(null);
  const cb = useRef(onReorder);
  cb.current = onReorder;

  useEffect(() => {
    if (!ref.current) return;
    const sortable = Sortable.create(ref.current, {
      animation: 150,
      disabled: options.disabled,
      handle: options.handle,
      delay: 150,
      delayOnTouchOnly: true,
      ghostClass: "opacity-40",
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        const el = evt.from;
        const ids = Array.from(el.children).map((c) => (c as HTMLElement).dataset.id).filter(Boolean) as string[];
        // devolve o DOM ao estado anterior: quem reordena de fato é o React
        el.removeChild(evt.item);
        el.insertBefore(evt.item, el.children[evt.oldIndex!] ?? null);
        cb.current(ids);
      },
    });
    return () => sortable.destroy();
  }, [options.disabled, options.handle]);

  return ref;
}
