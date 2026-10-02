import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { CustomerForm } from "./customer-form";
import {
  OperationalRegister,
  type RegisterColumn,
  type RegisterRecord,
} from "./operational-register";
import "./operational-register.css";
import { usePaginationState } from "../../components/ui/pagination-state";

interface Customer extends RegisterRecord {
  legalName?: string;
  industry?: string;
  serviceTier?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  taxId?: string;
  accountManager?: string;
  contractStart?: string;
  contractEnd?: string;
  createdAt?: string;
}

const columns: RegisterColumn<Customer>[] = [
  {
    key: "name",
    label: "Client name",
    render: (value, row) => (
      <div>
        <strong>{String(value)}</strong>
        {row.legalName ? (
          <>
            <br />
            <small>{row.legalName}</small>
          </>
        ) : null}
      </div>
    ),
  },
  {
    key: "code",
    label: "Code",
    render: (value) => <span className="fb-badge">{String(value)}</span>,
  },
  { key: "industry", label: "Industry" },
  { key: "serviceTier", label: "Service tier" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "contactName", label: "Primary contact" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "alternatePhone", label: "Alternate phone" },
  { key: "accountManager", label: "Account manager" },
  { key: "contractStart", label: "Contract start" },
  { key: "contractEnd", label: "Contract end" },
  { key: "taxId", label: "GST / Tax ID" },
  { key: "legalName", label: "Legal name" },
  { key: "postalCode", label: "PIN code" },
  { key: "country", label: "Country" },
  { key: "createdAt", label: "Created" },
];

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const pagination = usePaginationState(20);
  const query = useQuery({
    queryKey: [
      "customers",
      { search, page: pagination.page, limit: pagination.pageSize },
    ],
    queryFn: () =>
      api.get<{
        items: Customer[];
        total: number;
        page: number;
        limit: number;
      }>(
        `/customers?search=${encodeURIComponent(search)}&page=${pagination.page}&limit=${pagination.pageSize}`,
      ),
    placeholderData: (previous) => previous,
  });
  const items = query.data?.items ?? [];
  return (
    <OperationalRegister
      title="Clients"
      subtitle="Customer accounts, commercial context and field-service contacts in one configurable register."
      noun="client"
      items={items}
      total={query.data?.total ?? 0}
      columns={columns}
      defaultColumns={[
        "name",
        "code",
        "industry",
        "serviceTier",
        "city",
        "state",
        "contactName",
        "phone",
        "accountManager",
        "contractEnd",
      ]}
      stats={[
        {
          label: "Active clients",
          value: query.data?.total ?? 0,
          detail: "tenant-wide customer records",
        },
        {
          label: "Premium service",
          value: items.filter((item) =>
            ["PREMIUM", "ENTERPRISE"].includes(item.serviceTier ?? ""),
          ).length,
          detail: "in this page",
        },
        {
          label: "Industries",
          value: new Set(items.map((item) => item.industry).filter(Boolean))
            .size,
          detail: "represented in this view",
        },
        {
          label: "States covered",
          value: new Set(items.map((item) => item.state).filter(Boolean)).size,
          detail: "operational footprint",
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
      {creating ? <CustomerForm onDone={() => setCreating(false)} /> : null}
      {editingId ? (
        <CustomerForm
          customerId={editingId}
          onDone={() => setEditingId(null)}
        />
      ) : null}
    </OperationalRegister>
  );
}
