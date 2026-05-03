"use client";

import { useEffect, useRef, useState } from "react";
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
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    let queued = false;
    let cancelled = false;

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

      const next = {
        lastUpdatedAt: latest ? new Date(latest) : null,
        error: err,
      } satisfies Snapshot;
      const current = snapshotRef.current;
      if (
        current.error === next.error &&
        current.lastUpdatedAt?.getTime() === next.lastUpdatedAt?.getTime()
      ) {
        return;
      }
      snapshotRef.current = next;
      setSnapshot(next);
    }

    function scheduleRead() {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!cancelled) read();
      });
    }

    scheduleRead();
    const unsub = cache.subscribe(scheduleRead);
    return () => {
      cancelled = true;
      unsub();
    };
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
