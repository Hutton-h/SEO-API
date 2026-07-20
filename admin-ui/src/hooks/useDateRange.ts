import { useStore } from '@/store';
import type { DateRange } from '@/store';

export function useDateRange() {
  const dateRange = useStore(state => state.dateRange);
  const setDateRange = useStore(state => state.setDateRange);

  const setPreset = (label: string) => {
    const end = new Date().toISOString().split('T')[0];
    let start: string;
    switch (label) {
      case '7d': start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]; break;
      case '30d': start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]; break;
      case '90d': start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]; break;
      default: start = dateRange.start;
    }
    setDateRange({ start, end, label });
  };

  return { dateRange, setDateRange, setPreset };
}