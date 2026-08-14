import { useEffect, useState } from "react";
import { getApiHealth, type ApiHealth } from "../api/health";

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>("checking");

  useEffect(() => {
    const controller = new AbortController();
    void getApiHealth(controller.signal).then(setHealth);
    return () => controller.abort();
  }, []);

  return health;
}
