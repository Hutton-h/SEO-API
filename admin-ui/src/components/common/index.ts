/**
 * Crane SEO Platform - Common UI Components
 *
 * 统一导出所有可复用通用组件
 */

export { default as StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { default as CountrySelector } from './CountrySelector';
export type { CountrySelectorProps } from './CountrySelector';

export { default as DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps } from './DateRangePicker';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { default as ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { default as LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonProps } from './LoadingSkeleton';

export { default as StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusType } from './StatusBadge';

// 工具函数导出
export { getCountryFlag } from './CountrySelector';