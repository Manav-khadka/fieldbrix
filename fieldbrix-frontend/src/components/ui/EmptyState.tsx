import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = "◌",
  action,
  className = "",
}) => {
  return (
    <div className={`fb-empty-state ${className}`}>
      <div className="fb-empty-state-icon">{icon}</div>
      <h4 className="fb-empty-state-title">{title}</h4>
      {description && (
        <p className="fb-empty-state-description">{description}</p>
      )}
      {action && (
        <div className="fb-empty-state-action">
          <Button
            variant="secondary"
            size="sm"
            onClick={action.onClick}
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
