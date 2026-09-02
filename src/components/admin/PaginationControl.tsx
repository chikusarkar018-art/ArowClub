import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  itemName = 'rows',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize && totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0e15] border-t border-[#1e202e] text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-white">{startIndex}</span> to{' '}
          <span className="font-bold text-white">{endIndex}</span> of{' '}
          <span className="font-bold text-white">{totalItems}</span> {itemName} (20 per page)
        </div>
        <div className="text-[11px] text-slate-500 font-mono">Page 1 of 1</div>
      </div>
    );
  }

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#0d0e15] border-t border-[#1e202e] text-xs select-none">
      {/* Range Info */}
      <div className="text-slate-400 text-center sm:text-left">
        Showing <span className="font-bold text-white font-mono">{startIndex}</span> to{' '}
        <span className="font-bold text-white font-mono">{endIndex}</span> of{' '}
        <span className="font-bold text-white font-mono">{totalItems}</span> {itemName}{' '}
        <span className="text-slate-500 text-[11px]">(20 per page)</span>
      </div>

      {/* Navigation Buttons & Numbers */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg bg-[#141624] border border-[#23273c] flex items-center justify-center text-slate-300 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:hover:border-[#23273c] disabled:cursor-not-allowed transition"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg bg-[#141624] border border-[#23273c] flex items-center justify-center text-slate-300 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:hover:border-[#23273c] disabled:cursor-not-allowed transition"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="w-7 text-center text-slate-500 font-mono">
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(Number(page))}
                className={`min-w-[32px] h-8 px-2 rounded-lg font-bold font-mono text-xs transition ${
                  isCurrent
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-[#5b50e6]/40 ring-1 ring-white/30'
                    : 'bg-[#141624] border border-[#23273c] text-slate-300 hover:text-white hover:border-indigo-500'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg bg-[#141624] border border-[#23273c] flex items-center justify-center text-slate-300 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:hover:border-[#23273c] disabled:cursor-not-allowed transition"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg bg-[#141624] border border-[#23273c] flex items-center justify-center text-slate-300 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:hover:border-[#23273c] disabled:cursor-not-allowed transition"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
