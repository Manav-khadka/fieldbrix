import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { ServiceTargetForm } from "./service-target-form";
import {
  OperationalRegister,
  type RegisterColumn,
  type RegisterRecord,
} from "./operational-register";
import "./operational-register.css";
import { usePaginationState } from "../../components/ui/pagination-state";

interface Asset extends RegisterRecord {
  siteId: string;
  qrIdentity?: string;
  equipmentType?: string;
  assetCategory?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  condition?: string;
  criticality?: string;
  assetStatus?: string;
  installationDate?: string;
  warrantyEnd?: string;
  serviceFrequencyDays?: number;
  nextDue?: string;
  createdAt?: string;
}
const columns: RegisterColumn<Asset>[] = [
  {
    key: "name",
    label: "Asset / service point",
    render: (value, row) => (
      <div>
        <strong>{String(value)}</strong>
        <br />
        <small>{row.assetCategory || row.equipmentType || row.code}</small>
      </div>
    ),
  },
  {
    key: "code",
    label: "Code",
    render: (value) => <span className="fb-badge">{String(value)}</span>,
  },
  { key: "assetStatus", label: "Status" },
  { key: "criticality", label: "Criticality" },
  { key: "equipmentType", label: "Equipment type" },
  { key: "assetCategory", label: "Category" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "serialNumber", label: "Serial number" },
  { key: "location", label: "Installed at" },
  { key: "condition", label: "Condition" },
  { key: "installationDate", label: "Installed" },
  { key: "warrantyEnd", label: "Warranty end" },
  { key: "serviceFrequencyDays", label: "Service cycle" },
  { key: "nextDue", label: "Next service" },
  {
    key: "qrIdentity",
    label: "QR identity",
    render: (value) => <span className="fb-code">{String(value || "—")}</span>,
  },
  { key: "siteId", label: "Location ID" },
  { key: "createdAt", label: "Created" },
];
export function ServiceTargetsPage() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pagination = usePaginationState(20);
  const query = useQuery({
    queryKey: [
      "service-targets",
      { search, page: pagination.page, limit: pagination.pageSize },
    ],
    queryFn: () =>
      api.get<{ items: Asset[]; total: number; page: number; limit: number }>(
        `/service-targets?search=${encodeURIComponent(search)}&page=${pagination.page}&limit=${pagination.pageSize}`,
      ),
    placeholderData: (previous) => previous,
  });
  const items = query.data?.items ?? [];
  return (
    <OperationalRegister
      title="Assets & service points"
      subtitle="Maintainable equipment, meters, rooms and service points tied to field workflows."
      noun="asset"
      items={items}
      total={query.data?.total ?? 0}
      columns={columns}
      defaultColumns={[
        "name",
        "code",
        "assetStatus",
        "criticality",
        "equipmentType",
        "manufacturer",
        "model",
        "serialNumber",
        "location",
        "nextDue",
      ]}
      stats={[
        {
          label: "Active assets",
          value: query.data?.total ?? 0,
          detail: "available as task targets",
        },
        {
          label: "Critical",
          value: items.filter(
            (item) =>
              item.criticality === "CRITICAL" || item.criticality === "HIGH",
          ).length,
          detail: "high-priority equipment in this page",
        },
        {
          label: "Service due",
          value: items.filter(
            (item) =>
              item.nextDue &&
              new Date(item.nextDue) <= new Date(Date.now() + 30 * 86400000),
          ).length,
          detail: "within the next 30 days",
        },
        {
          label: "Manufacturers",
          value: new Set(items.map((item) => item.manufacturer).filter(Boolean))
            .size,
          detail: "represented in this view",
        },
      ]}
      search={search}
      onSearch={(value) => {
        setSearch(value);
        pagination.resetPage();
      }}
      onAdd={() => {
        setEditingId(null);
        setCreating((value) => !value);
      }}
      onEdit={(id) => {
        setCreating(false);
        setEditingId(id);
      }}
      loading={query.isLoading}
      error={Boolean(query.error)}
      page={pagination.page}
      limit={pagination.pageSize}
      onPage={pagination.setPage}
      onLimit={pagination.setPageSize}
    >
      {creating ? (
        <ServiceTargetForm onDone={() => setCreating(false)} />
      ) : null}
      {editingId ? (
        <ServiceTargetForm
          targetId={editingId}
          onDone={() => setEditingId(null)}
        />
      ) : null}
    </OperationalRegister>
  );
}
