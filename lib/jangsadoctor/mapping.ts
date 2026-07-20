export type ImportStoreSource = {
  sourceCompanyId: string;
  storeName: string;
};

export type CanonicalStoreCandidate = {
  id: string;
  name: string;
  environment: string | null;
  lifecycleStatus: string | null;
  managerName: string | null;
};

export type ExistingSourceLink = {
  sourceCompanyId: string;
  storeId: string;
};

export type MappingPreviewRow = ImportStoreSource & {
  status: "already_linked" | "candidate_found" | "unmatched";
  linkedStoreId: string | null;
  candidateStoreIds: string[];
};

function normalizedName(value: string) {
  return value.replace(/\s+/g, "").trim().toLocaleLowerCase("ko-KR");
}

export function buildSalesHistoryMappingPreview(
  sources: ImportStoreSource[],
  stores: CanonicalStoreCandidate[],
  existingLinks: ExistingSourceLink[],
) {
  const linksBySource = new Map(existingLinks.map((link) => [link.sourceCompanyId, link.storeId]));
  const storesByName = new Map<string, CanonicalStoreCandidate[]>();
  stores.forEach((store) => {
    const key = normalizedName(store.name);
    const current = storesByName.get(key) ?? [];
    current.push(store);
    storesByName.set(key, current);
  });

  const rows: MappingPreviewRow[] = sources.map((source) => {
    const linkedStoreId = linksBySource.get(source.sourceCompanyId) ?? null;
    if (linkedStoreId) return { ...source, status: "already_linked", linkedStoreId, candidateStoreIds: [linkedStoreId] };
    const candidates = storesByName.get(normalizedName(source.storeName)) ?? [];
    return {
      ...source,
      status: candidates.length ? "candidate_found" : "unmatched",
      linkedStoreId: null,
      candidateStoreIds: candidates.map((candidate) => candidate.id),
    };
  });

  return {
    rows,
    summary: {
      total: rows.length,
      alreadyLinked: rows.filter((row) => row.status === "already_linked").length,
      candidateFound: rows.filter((row) => row.status === "candidate_found").length,
      unmatched: rows.filter((row) => row.status === "unmatched").length,
    },
  };
}
