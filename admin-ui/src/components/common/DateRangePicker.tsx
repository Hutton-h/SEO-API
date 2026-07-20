import React, { useMemo, useCallback } from 'react';
import { DatePicker, Space, Button, Typography } from 'antd';
import { CalendarOutlined, CaretDownOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useStore } from '../../store';
import type { DateRange } from '../../store';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

export interface DateRangePickerProps {
  /** 受控值 */
  value?: { start: string; end: string };
  /** 变更回调 */
  onChange?: (range: { start: string; end: string; label: string }) => void;
  /** 预设快捷键，如 ['7d', '30d', '90d'] */
  presets?: string[];
  /** 允许清空 */
  allowClear?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================================================
// Preset definitions
// ============================================================================

interface PresetItem {
  key: string;
  label: string;
  getRange: () => [Dayjs, Dayjs];
}

const ALL_PRESETS: PresetItem[] = [
  {
    key: 'today',
    label: '今天',
    getRange: () => [dayjs().startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'yesterday',
    label: '昨天',
    getRange: () => [
      dayjs().subtract(1, 'day').startOf('day'),
      dayjs().subtract(1, 'day').endOf('day'),
    ],
  },
  {
    key: '7d',
    label: '近7天',
    getRange: () => [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: '30d',
    label: '近30天',
    getRange: () => [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: '90d',
    label: '近90天',
    getRange: () => [dayjs().subtract(89, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'thisMonth',
    label: '本月',
    getRange: () => [dayjs().startOf('month'), dayjs().endOf('day')],
  },
  {
    key: 'thisQuarter',
    label: '本季',
    getRange: () => {
      const quarterStartMonth = Math.floor(dayjs().month() / 3) * 3;
      return [dayjs().month(quarterStartMonth).startOf('month'), dayjs().endOf('day')];
    },
  },
  {
    key: 'thisYear',
    label: '今年',
    getRange: () => [dayjs().startOf('year'), dayjs().endOf('day')],
  },
  {
    key: 'lastMonth',
    label: '上月',
    getRange: () => [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ],
  },
  {
    key: 'lastQuarter',
    label: '上季',
    getRange: () => {
      const quarterStartMonth = Math.floor(dayjs().subtract(3, 'month').month() / 3) * 3;
      return [
        dayjs().subtract(3, 'month').month(quarterStartMonth).startOf('month'),
        dayjs().subtract(1, 'month').month(quarterStartMonth + 2).endOf('month'),
      ];
    },
  },
];

/**
 * 根据预设 key 列表获取要显示的预设项
 */
function getPresets(keys?: string[]): PresetItem[] {
  if (!keys || keys.length === 0) {
    // 默认显示常用预设
    return ALL_PRESETS.filter((p) =>
      ['today', '7d', '30d', '90d', 'thisMonth', 'thisQuarter'].includes(p.key)
    );
  }
  return ALL_PRESETS.filter((p) => keys.includes(p.key));
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * 格式化 dayjs 为 YYYY-MM-DD 字符串
 */
function formatDate(d: Dayjs): string {
  return d.format('YYYY-MM-DD');
}

/**
 * 根据预设 key 获取 label
 */
function getPresetLabel(key: string): string {
  const preset = ALL_PRESETS.find((p) => p.key === key);
  return preset ? preset.label : '自定义';
}

// ============================================================================
// Component
// ============================================================================

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets: presetKeys,
  allowClear = false,
  style,
}) => {
  const { dateRange: storeDateRange, setDateRange } = useStore();

  // 当前日期范围：优先使用受控 value，否则使用 store
  const currentRange = useMemo(() => {
    if (value) {
      return {
        start: dayjs(value.start),
        end: dayjs(value.end),
      };
    }
    return {
      start: dayjs(storeDateRange.start),
      end: dayjs(storeDateRange.end),
    };
  }, [value, storeDateRange]);

  const currentLabel = value ? '' : storeDateRange.label;

  const activePresets = useMemo(() => getPresets(presetKeys), [presetKeys]);

  // 判断当前选中的是哪个预设
  const activePresetKey = useMemo(() => {
    for (const preset of activePresets) {
      const [ps, pe] = preset.getRange();
      if (
        currentRange.start.format('YYYY-MM-DD') === ps.format('YYYY-MM-DD') &&
        currentRange.end.format('YYYY-MM-DD') === pe.format('YYYY-MM-DD')
      ) {
        return preset.key;
      }
    }
    return null;
  }, [currentRange, activePresets]);

  // 处理预设按钮点击
  const handlePresetClick = useCallback(
    (preset: PresetItem) => {
      const [start, end] = preset.getRange();
      const newRange: DateRange = {
        start: formatDate(start),
        end: formatDate(end),
        label: preset.key,
      };

      if (onChange) {
        onChange(newRange);
      } else {
        setDateRange(newRange);
      }
    },
    [onChange, setDateRange]
  );

  // 处理 RangePicker 变更
  const handleRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates || !dates[0] || !dates[1]) return;

      const newRange: DateRange = {
        start: formatDate(dates[0]),
        end: formatDate(dates[1]),
        label: 'custom',
      };

      if (onChange) {
        onChange(newRange);
      } else {
        setDateRange(newRange);
      }
    },
    [onChange, setDateRange]
  );

  // 构建 RangePicker 预设（Ant Design 5.x 期望数组格式）
  const rangePickerPresets = useMemo(() => {
    return activePresets.map((preset) => ({
      label: preset.label,
      value: preset.getRange(),
    }));
  }, [activePresets]);

  return (
    <Space size={8} wrap style={style}>
      {/* 预设快捷按钮 */}
      <Space size={4} wrap>
        {activePresets.map((preset) => (
          <Button
            key={preset.key}
            size="small"
            type={activePresetKey === preset.key ? 'primary' : 'default'}
            onClick={() => handlePresetClick(preset)}
            style={{
              fontWeight: activePresetKey === preset.key ? 600 : 400,
              fontSize: 12,
            }}
          >
            {preset.label}
          </Button>
        ))}
      </Space>

      {/* 日期范围选择器 */}
      <RangePicker
        value={[currentRange.start, currentRange.end]}
        onChange={handleRangeChange as any}
        allowClear={allowClear}
        size="small"
        presets={rangePickerPresets}
        format="YYYY-MM-DD"
        placeholder={['开始日期', '结束日期']}
        style={{ minWidth: 240 }}
        suffixIcon={<CalendarOutlined />}
      />

      {/* 当前选中范围标签 */}
      {currentLabel && activePresetKey === null && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {getPresetLabel(currentLabel)}
        </Text>
      )}
    </Space>
  );
};

export default DateRangePicker;