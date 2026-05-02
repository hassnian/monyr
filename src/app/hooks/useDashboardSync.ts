"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

/**
 * Cross-cutting view of the dashboard's data freshness. Aggregates state from
 * the queries that feed the metrics band and the inbox so a single bar can
 * surface "live / X ago / refresh" without binding to one surface.
 *
 * Refresh invalidates both query namespaces; surfaces re-fetch on their own
 * cadence.
 */
type Snapshot = {
  lastUpdatedAt: Date | null;
  error: string | null;
};

const DASHBOARD_QUERY_PREFIXES = ["inbox", "metrics"] as const;

export function useDashboardSync() {
  const queryClient = useQueryClient();
  const fetchingCount = useIsFetching({
    predicate: (query) =>
      DASHBOARD_QUERY_PREFIXES.includes(
        query.queryKey[0] as (typeof DASHBOARD_QUERY_PREFIXES)[number],
      ),
  });
  const [snapshot, setSnapshot] = useState<Snapshot>({
    lastUpdatedAt: null,
    error: null,
  });

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    function read() {
      const queries = cache.getAll().filter((q) => {
        const head = q.queryKey[0];
        return (
          typeof head === "string" &&
          (DASHBOARD_QUERY_PREFIXES as readonly string[]).includes(head)
        );
      });
      let latest = 0;
      let err: string | null = null;
      for (const q of queries) {
        if (q.state.dataUpdatedAt > latest) latest = q.state.dataUpdatedAt;
        if (q.state.error && !err) {
          err = "Couldn't reach the network. Try refreshing.";
        }
      }
      setSnapshot({
        lastUpdatedAt: latest ? new Date(latest) : null,
        error: err,
      });
    }
    read();
    const unsub = cache.subscribe(read);
    return unsub;
  }, [queryClient]);

  function refresh() {
    for (const prefix of DASHBOARD_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    }
  }

  return {
    isFetching: fetchingCount > 0,
    lastUpdatedAt: snapshot.lastUpdatedAt,
    error: snapshot.error,
    refresh,
  };
}
