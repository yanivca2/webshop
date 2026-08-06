import { useQuery } from '@tanstack/react-query';
import type { ApiError, GreetingResponse } from '../types/api';

async function fetchGreeting(name: string, signal: AbortSignal): Promise<GreetingResponse> {
  const query = name ? `?name=${encodeURIComponent(name)}` : '';
  const response = await fetch(`/api/greeting${query}`, { signal });

  if (!response.ok) {
    const problem: Partial<ApiError> = await response.json().catch(() => ({}));
    throw new Error(problem.message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as GreetingResponse;
}

export function useGreeting(name: string) {
  return useQuery({
    queryKey: ['greeting', name],
    queryFn: ({ signal }) => fetchGreeting(name, signal),
  });
}
