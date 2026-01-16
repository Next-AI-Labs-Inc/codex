import { useEffect, useRef, useState } from "react";
import type { SpecFlow } from "@/lib/specFlows";

type UseSpecFlowsState = {
  data: SpecFlow[];
  loading: boolean;
  error?: string;
};

const DEFAULT_STATE: UseSpecFlowsState = {
  data: [],
  loading: true,
};

export function useSpecFlows(pollIntervalMs = 5000) {
  const [state, setState] = useState<UseSpecFlowsState>(DEFAULT_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch("/api/spec-flows");
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const payload = (await response.json()) as { data: SpecFlow[] };
        if (!cancelled) {
          setState({ data: payload.data ?? [], loading: false });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load spec flows.",
          }));
        }
      }
    };

    fetchData();
    intervalRef.current = setInterval(fetchData, pollIntervalMs);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollIntervalMs]);

  return state;
}
