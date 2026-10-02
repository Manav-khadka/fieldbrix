import { useEffect } from "react";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

type PageToken = number | "ellipsis-left" | "ellipsis-right";

function pageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const ordered = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  ordered.forEach((value, index) => {
    const previous = ordered[index - 1];
    if (previous && value - previous > 1) {
      tokens.push(previous === 1 ? "ellipsis-left" : "ellipsis-right");
    }
    tokens.push(value);
  });
  return tokens;
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  label?: string;
  disabled?: boolean;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  label = "Table pagination",
  disabled = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const tokens = pageTokens(currentPage, totalPages);

  useEffect(() => {
    if (page !== currentPage) onPageChange(currentPage);
  }, [currentPage, onPageChange, page]);

  const goTo = (nextPage: number) => {
    onPageChange(Math.min(Math.max(1, nextPage), totalPages));
  };

  return (
    <nav className="fb-pagination" aria-label={label}>
      <div className="fb-pagination__summary" aria-live="polite">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of{" "}
        <strong>{total}</strong>
      </div>

      <div className="fb-pagination__controls">
        <button
          type="button"
          className="fb-pagination__nav"
          onClick={() => goTo(1)}
          disabled={disabled || currentPage === 1}
          aria-label="Go to first page"
        >
          «
        </button>
        <button
          type="button"
          className="fb-pagination__nav fb-pagination__nav--wide"
          onClick={() => goTo(currentPage - 1)}
          disabled={disabled || currentPage === 1}
        >
          Previous
        </button>

        <div className="fb-pagination__pages" aria-label="Choose page">
          {tokens.map((token) =>
            typeof token === "number" ? (
              <button
                key={token}
                type="button"
                className="fb-pagination__page"
                aria-current={token === currentPage ? "page" : undefined}
                aria-label={`Go to page ${token}`}
                disabled={disabled || total === 0}
                onClick={() => goTo(token)}
              >
                {token}
              </button>
            ) : (
              <span
                key={token}
                className="fb-pagination__ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          className="fb-pagination__nav fb-pagination__nav--wide"
          onClick={() => goTo(currentPage + 1)}
          disabled={disabled || currentPage === totalPages}
        >
          Next
        </button>
        <button
          type="button"
          className="fb-pagination__nav"
          onClick={() => goTo(totalPages)}
          disabled={disabled || currentPage === totalPages}
          aria-label="Go to last page"
        >
          »
        </button>
      </div>

      {onPageSizeChange ? (
        <label className="fb-pagination__size">
          <span>Rows per page</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {[...new Set([...pageSizeOptions, pageSize])]
              .sort((a, b) => a - b)
              .map((size) => (
                <option value={size} key={size}>
                  {size}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <span className="fb-pagination__page-count">
          Page {currentPage} of {totalPages}
        </span>
      )}
    </nav>
  );
}
