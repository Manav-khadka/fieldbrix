import { useCallback, useEffect, useMemo, useState } from "react";

export function usePaginationState(initialPageSize = 20, total?: number) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages =
    total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize));
  const safePage = totalPages === undefined ? page : Math.min(page, totalPages);

  useEffect(() => {
    if (totalPages !== undefined) {
      setPageState((current) => Math.min(current, totalPages));
    }
  }, [totalPages]);

  const setPage = useCallback(
    (next: number | ((current: number) => number)) =>
      setPageState((current) => {
        const value = typeof next === "function" ? next(current) : next;
        return totalPages === undefined
          ? Math.max(1, value)
          : Math.min(Math.max(1, value), totalPages);
      }),
    [totalPages],
  );
  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPageState(1);
  }, []);
  const resetPage = useCallback(() => setPageState(1), []);

  return {
    page: safePage,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    totalPages,
  };
}

export function useClientPagination<T>(items: T[], initialPageSize = 20) {
  const pagination = usePaginationState(initialPageSize, items.length);
  const pageItems = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return items.slice(start, start + pagination.pageSize);
  }, [items, pagination.page, pagination.pageSize]);

  return { ...pagination, pageItems, total: items.length };
}
