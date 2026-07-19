"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CanonicalStore, StoreRecord, toCanonicalStore } from "@/lib/stores/registry";

type StoreRegistryValue = {
  stores: CanonicalStore[];
  selectedStoreId: string;
  selectedStore: CanonicalStore | null;
  loading: boolean;
  error: string;
  selectStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
};

const StoreRegistryContext = createContext<StoreRegistryValue | null>(null);

export function StoreRegistryProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<CanonicalStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshStores = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/erp/stores");
      const payload = (await response.json()) as { stores?: StoreRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "매장 목록 조회 실패");
      setStores((payload.stores ?? []).map(toCanonicalStore));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "매장 목록 조회 실패");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStores();
  }, [refreshStores]);

  useEffect(() => {
    if (!stores.length) {
      setSelectedStoreId("");
      return;
    }
    const urlStoreId = new URL(window.location.href).searchParams.get("storeId") ?? "";
    setSelectedStoreId((current) => {
      if (stores.some((store) => store.id === current)) return current;
      if (stores.some((store) => store.id === urlStoreId)) return urlStoreId;
      return stores[0].id;
    });
  }, [stores]);

  const selectStore = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);
    const url = new URL(window.location.href);
    url.searchParams.set("storeId", storeId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const value = useMemo<StoreRegistryValue>(() => ({
    stores,
    selectedStoreId,
    selectedStore: stores.find((store) => store.id === selectedStoreId) ?? null,
    loading,
    error,
    selectStore,
    refreshStores,
  }), [stores, selectedStoreId, loading, error, selectStore, refreshStores]);

  return <StoreRegistryContext.Provider value={value}>{children}</StoreRegistryContext.Provider>;
}

export function useStoreRegistry() {
  const value = useContext(StoreRegistryContext);
  if (!value) throw new Error("useStoreRegistry must be used inside StoreRegistryProvider");
  return value;
}
