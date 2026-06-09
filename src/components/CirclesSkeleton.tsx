import React from 'react';

export const CirclesSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs select-none">
      {/* Header metadata placeholder */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full shimmer" />
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-28 shimmer rounded" />
            <div className="h-3 w-36 shimmer rounded" />
          </div>
        </div>
        <div className="w-14 h-6 shimmer rounded-lg" />
      </div>

      {/* Main content placeholder */}
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="h-3 w-full shimmer rounded" />
        <div className="h-3 w-11/12 shimmer rounded" />
        <div className="h-3 w-4/5 shimmer rounded" />
      </div>

      {/* Action buttons placeholder */}
      <div className="flex items-center gap-6 mt-6 pt-3 border-t border-zinc-150 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 shimmer rounded-full" />
          <div className="h-3 w-6 shimmer rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 shimmer rounded-full" />
          <div className="h-3 w-6 shimmer rounded" />
        </div>
      </div>
    </div>
  );
};
