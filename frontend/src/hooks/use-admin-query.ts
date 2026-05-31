"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseAdminQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  retry?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAdminQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  retry = 3,
  onSuccess,
  onError,
}: UseAdminQueryOptions<T>): UseAdminQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const query = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await queryFn();
        setData(result);
        onSuccess?.(result);
        setIsLoading(false);
        return;
      } catch (err) {
        lastError = err as Error;
        if (attempt < retry) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    const finalError = lastError || new Error("Query failed");
    setError(finalError);
    onError?.(finalError);
    setIsLoading(false);
  }, [queryKey.join(","), enabled, retry, queryFn, onSuccess, onError]);

  useEffect(() => {
    query();
  }, [queryKey.join(","), enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: query,
  };
}

// Mutation hook for create/update/delete operations
export interface UseAdminMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

export function useAdminMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
}: UseAdminMutationOptions<TData, TVariables>): UseAdminMutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsPending(true);
    setError(null);
    
    try {
      const result = await mutationFn(variables);
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const mutationError = err as Error;
      setError(mutationError);
      onError?.(mutationError);
    } finally {
      setIsPending(false);
    }
  }, [mutationFn, onSuccess, onError]);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsPending(true);
    setError(null);
    
    try {
      const result = await mutationFn(variables);
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const mutationError = err as Error;
      setError(mutationError);
      onError?.(mutationError);
      throw mutationError;
    } finally {
      setIsPending(false);
    }
  }, [mutationFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setError(null);
    setData(undefined);
  }, []);

  return {
    mutate,
    mutateAsync,
    isPending,
    error,
    data,
    reset,
  };
}