import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { SiteForm } from "./site-form";
import {
  OperationalRegister,
  type RegisterColumn,
  type RegisterRecord,
} from "./operational-register";
import "./operational-register.css";
import { usePaginationState } from "../../components/ui/pagination-state";

interface Site extends RegisterRecord {
  customerId: string;
  siteType?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceZone?: string;
  operatingHours?: string;
  gps?: { lat: number; lng: number };
  accessNotes?: string;
  parkingNotes?: string;
  safetyNotes?: string;
  createdAt?: string;
}
const columns: RegisterColumn<Site>[] = [
  {
    key: "name",
    label: "Location",
    render: (value, row) => (
      <div>
        <strong>{String(value)}</strong>
        <br />
        <small>{row.siteType || row.code}</small>
      </div>
    ),
  },
  {
    key: "code",
    label: "Code",
    render: (value) => <span className="fb-badge">{String(value)}</span>,
  },
  { key: "siteType", label: "Location type" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "serviceZone", label: "Service zone" },
  { key: "contactName", label: "Site contact" },
  { key: "contactPhone", label: "Phone" },
  { key: "contactEmail", label: "Email" },
  { key: "operatingHours", label: "Operating hours" },
  {
    key: "gps",
    label: "GPS",
    render: (value) => {
      const gps = value as Site["gps"];
      return gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "—";
    },
  },
  { key: "timezone", label: "Timezone" },
  { key: "postalCode", label: "PIN code" },
  { key: "country", label: "Country" },
  { key: "accessNotes", label: "Access notes" },
  { key: "parkingNotes", label: "Parking" },
  { key: "safetyNotes", label: "Safety" },
  { key: "createdAt", label: "Created" },
];
export function SitesPage() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pagination = usePaginationState(20);
  const query = useQuery({
    queryKey: [
      "sites",
      { search, page: pagination.page, limit: pagination.pageSize },
    ],
    queryFn: () =>
      api.get<{ items: Site[]; total: number; page: number; limit: number }>(
        `/sites?search=${encodeURIComponent(search)}&page=${pagination.page}&limit=${pagination.pageSize}`,
      ),
    placeholderData: (previous) => previous,
  });
  const items = query.data?.items ?? [];
  return (
    <OperationalRegister
      title="Locations"
      subtitle="Company branches, customer sites and service locations with dispatch-ready coordinates."
      noun="location"
      items={items}
      total={query.data?.total ?? 0}
      columns={columns}
      defaultColumns={[
        "name",
        "code",
        "siteType",
        "city",
        "state",
        "serviceZone",
        "contactName",
        "contactPhone",
        "operatingHours",
        "gps",
      ]}
      stats={[
        {
          label: "Active locations",
          value: query.data?.total ?? 0,
          detail: "available for task dispatch",
        },
        {
          label: "Mapped",
          value: items.filter((item) => item.gps).length,
          detail: "with usable coordinates in this page",
        },
        {
          label: "Service zones",
          value: new Set(items.map((item) => item.serviceZone).filter(Boolean))
            .size,
          detail: "represented in this view",
        },
        {
          label: "States",
          value: new Set(items.map((item) => item.state).filter(Boolean)).size,
          detail: "covered by operations",
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
      {creating ? <SiteForm onDone={() => setCreating(false)} /> : null}
      {editingId ? (
        <SiteForm siteId={editingId} onDone={() => setEditingId(null)} />
      ) : null}
    </OperationalRegister>
  );
}
