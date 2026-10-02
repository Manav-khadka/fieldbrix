import React from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "glass";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = "neutral",
  subtitle,
  icon,
  variant = "default",
  className = "",
}) => {
  return (
    <Card variant={variant} className={`fb-stat-card ${className}`}>
      <div className="fb-stat-header">
        <span className="fb-stat-title">{title}</span>
        {icon && <div className="fb-stat-icon-wrapper">{icon}</div>}
      </div>

      <div className="fb-stat-main">
        <div className="fb-stat-value">{value}</div>
        {change && (
          <Badge
            variant={
              trend === "up"
                ? "success"
                : trend === "down"
                  ? "danger"
                  : "neutral"
            }
            size="xs"
          >
            {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}
            {change}
          </Badge>
        )}
      </div>

      {subtitle && <div className="fb-stat-subtitle">{subtitle}</div>}
    </Card>
  );
};
