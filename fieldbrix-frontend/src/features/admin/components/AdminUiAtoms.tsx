import type { ReactNode } from "react";
import { SparklesIcon, CheckIcon } from "../../../components/icons";

export function Metric({
  label,
  value,
  detail,
  tone,
  go,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  go: () => void;
}) {
  return (
    <button className={`metric-card ${tone}`} onClick={go}>
      <span>{label} ↗</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <i />
    </button>
  );
}

export function PanelTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action && <button onClick={onClick}>{action} →</button>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span style={{ display: "flex", justifyContent: "center" }}>
        <SparklesIcon size={24} />
      </span>
      <b>Nothing here yet</b>
      <small>{text}</small>
    </div>
  );
}

export function Intro({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <span className="eyebrow accent">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {children}
    </section>
  );
}

export function Status({ value }: { value: string }) {
  return (
    <span className={`status-pill ${value.toLowerCase()}`}>
      <CheckIcon size={12} />
      {value}
    </span>
  );
}

export function TableHead({ labels }: { labels: string[] }) {
  return (
    <div className="table-head">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}
