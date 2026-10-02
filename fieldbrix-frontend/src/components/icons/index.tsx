import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

const defaultProps = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const DashboardIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export const CustomersIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const SitesIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

export const BuildingsIcon = SitesIcon;

export const ServiceTargetIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const PartsIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

export const ImportIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export const WorkflowIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
);

export const TaskIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M12 2H2v20h20V12" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export const CapacityIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M12 20v-6M6 20V10M18 20V4" />
  </svg>
);

export const ReviewQueueIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const AdminIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const GripIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

export const SmartphoneIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <line x1="12" x2="12.01" y1="18" y2="18" />
  </svg>
);

export const TabletIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* Workflow Field Types Icons */
export const TextIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" x2="15" y1="20" y2="20" />
    <line x1="12" x2="12" y1="4" y2="20" />
  </svg>
);

export const TextAreaIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

export const NumberIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

export const ToggleIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="20" height="12" x="2" y="6" rx="6" ry="6" />
    <circle cx="16" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const SelectIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <polyline points="8 10 12 14 16 10" />
  </svg>
);

export const MultiSelectIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="6" height="6" x="3" y="4" rx="1" />
    <line x1="12" x2="21" y1="7" y2="7" />
    <rect width="6" height="6" x="3" y="14" rx="1" />
    <line x1="12" x2="21" y1="17" y2="17" />
  </svg>
);

export const DateIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
    <circle cx="8" cy="18" r="1" fill="currentColor" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const TimeIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const PhotoIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const SignatureIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="m18 2 4 4-14 14H4v-4L18 2Z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const BarcodeIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="M3 5v14" />
    <path d="M8 5v14" />
    <path d="M12 5v14" />
    <path d="M17 5v14" />
    <path d="M21 5v14" />
  </svg>
);

export const GpsIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <line x1="12" x2="12" y1="2" y2="5" />
    <line x1="12" x2="12" y1="19" y2="22" />
    <line x1="2" x2="5" y1="12" y2="12" />
    <line x1="19" x2="22" y1="12" y2="12" />
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  </svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export const LayersIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg width={size} height={size} {...defaultProps} className={`fb-icon ${className}`} {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
