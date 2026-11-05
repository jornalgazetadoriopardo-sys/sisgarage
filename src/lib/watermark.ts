import "server-only";
import type { Store } from "@prisma/client";
import type { WatermarkConfig } from "./storage";

export function watermarkOf(store: Pick<Store, "watermarkEnabled" | "watermarkUrl" | "watermarkPosition" | "watermarkSize" | "watermarkOpacity">): WatermarkConfig {
  return {
    enabled: store.watermarkEnabled,
    url: store.watermarkUrl,
    position: store.watermarkPosition,
    size: store.watermarkSize,
    opacity: store.watermarkOpacity,
  };
}
