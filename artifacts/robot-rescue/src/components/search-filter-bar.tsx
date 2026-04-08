import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export type SeverityFilter = "all" | "high" | "medium" | "low";
export type SortKey = "newest" | "oldest" | "severity";

interface SearchFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  severityFilter: SeverityFilter;
  onSeverityChange: (s: SeverityFilter) => void;
  sortKey: SortKey;
  onSortChange: (s: SortKey) => void;
  resultCount?: number;
  totalCount?: number;
  placeholder?: string;
  extraFilters?: React.ReactNode;
  className?: string;
}

export function SearchFilterBar({
  query,
  onQueryChange,
  severityFilter,
  onSeverityChange,
  sortKey,
  onSortChange,
  resultCount,
  totalCount,
  placeholder = "Search by robot ID, issue, or location...",
  extraFilters,
  className = "",
}: SearchFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = severityFilter !== "all" || sortKey !== "newest";
  const filterCount = (severityFilter !== "all" ? 1 : 0) + (sortKey !== "newest" ? 1 : 0);

  const clearAll = () => {
    onQueryChange("");
    onSeverityChange("all");
    onSortChange("newest");
  };

  const hasAnyActive = query !== "" || hasFilters;

  return (
    <div className={`space-y-0 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            className="pl-9 bg-secondary/40 border-border h-9 text-sm font-mono focus-visible:ring-primary/50"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 h-9 px-3 rounded border text-xs font-mono transition-all ${
            showFilters || hasFilters
              ? "border-primary/50 text-primary bg-primary/10"
              : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
              {filterCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        <div className="flex items-center gap-1">
          <select
            value={sortKey}
            onChange={e => onSortChange(e.target.value as SortKey)}
            className="h-9 bg-secondary/40 border border-border rounded px-2 text-[11px] font-mono text-muted-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="severity">By severity</option>
          </select>
        </div>

        {hasAnyActive && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        {resultCount !== undefined && totalCount !== undefined && (
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {resultCount} / {totalCount}
            {hasAnyActive && <span className="text-primary ml-1">(filtered)</span>}
          </span>
        )}
      </div>

      {showFilters && (
        <div className="pt-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Severity</span>
            <div className="flex gap-1">
              {(["all", "high", "medium", "low"] as SeverityFilter[]).map(sev => (
                <button
                  key={sev}
                  onClick={() => onSeverityChange(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all capitalize ${
                    severityFilter === sev
                      ? sev === "high" ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : sev === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : sev === "low" ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        : "bg-primary/20 text-primary border-primary/40"
                      : "text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {extraFilters && (
            <>
              <div className="h-4 w-px bg-border" />
              {extraFilters}
            </>
          )}
        </div>
      )}
    </div>
  );
}
