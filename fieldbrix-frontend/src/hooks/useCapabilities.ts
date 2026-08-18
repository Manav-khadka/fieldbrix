import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type Capability = string;

interface CapabilitiesResponse {
  capabilities?: Capability[];
  grants?: Capability[];
  scopes?: Record<string, string[]>;
  features?: string[];
}

export function useCapabilities() {
  const { data, isLoading } = useQuery<CapabilitiesResponse>({
    queryKey: ["me", "capabilities"],
    queryFn: () => api.get<CapabilitiesResponse>("/me/capabilities"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const capabilities = data?.grants ?? data?.capabilities ?? [];

  return {
    capabilities,
    isLoading,
    can: (permission: string) => capabilities.includes(permission),
  };
}
