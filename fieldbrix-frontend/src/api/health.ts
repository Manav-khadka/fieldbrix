export type ApiHealth = "checking" | "online" | "unavailable";

interface HealthEnvelope {
  data: { status: string };
}

export async function getApiHealth(signal: AbortSignal): Promise<ApiHealth> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/health/live`,
      { signal },
    );
    if (!response.ok) return "unavailable";
    const payload = (await response.json()) as HealthEnvelope;
    return payload.data.status === "live" ? "online" : "unavailable";
  } catch {
    return "unavailable";
  }
}
