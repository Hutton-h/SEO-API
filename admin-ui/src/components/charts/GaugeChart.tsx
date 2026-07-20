import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface GaugeThreshold {
  /** 阈值点 */
  value: number;
  /** 阈值对应的颜色 */
  color: string;
}

export interface GaugeChartProps {
  /** 当前值 */
  value: number;
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 300 */
  height?: number;
  /** 最大值，默认 100 */
  max?: number;
  /** 最小值，默认 0 */
  min?: number;
  /** 数值单位 */
  unit?: string;
  /** 分段阈值配置，按 value 升序排列。如 [{ value: 60, color: '#ff4d4f' }, { value: 80, color: '#faad14' }, { value: 100, color: '#52c41a' }] */
  thresholds?: GaugeThreshold[];
}

// ============ Constants ============

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans CJK SC', sans-serif";

const DEFAULT_THRESHOLDS: GaugeThreshold[] = [
  { value: 50, color: '#ff4d4f' },
  { value: 75, color: '#faad14' },
  { value: 100, color: '#52c41a' },
];

const EMPTY_OPTION = {
  title: {
    text: '暂无数据',
    left: 'center',
    top: 'center',
    textStyle: {
      color: '#999',
      fontSize: 14,
      fontFamily: FONT_FAMILY,
    },
  },
  series: [],
};

// ============ Helpers ============

/**
 * Build progress bar segments from thresholds.
 * Sorts thresholds and detects the active segment for the current value.
 */
function buildProgressSegments(
  thresholds: GaugeThreshold[],
  value: number,
  max: number,
  min: number
): Array<[number, string]> {
  // Sort ascending by value
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);

  const segments: Array<[number, string]> = [];
  const range = max - min;

  let prevThreshold = min;
  for (const t of sorted) {
    const normalizedPrev = ((prevThreshold - min) / range) * 100;
    const normalizedCurr = ((t.value - min) / range) * 100;
    const end = Math.min(normalizedCurr, 100);

    // Determine if this segment is active
    if (value >= prevThreshold && value < t.value) {
      // Current value falls in this segment - split into active + remaining
      const activeEnd = ((value - min) / range) * 100;
      // Active portion
      segments.push([activeEnd, t.color]);
      // Remaining portion (dimmer)
      segments.push([end, `${t.color}33`]);
    } else if (value >= t.value) {
      // Fully passed
      segments.push([end, t.color]);
    } else {
      // Not yet reached
      segments.push([end, `${t.color}33`]);
    }

    prevThreshold = t.value;
  }

  // Handle value beyond the last threshold
  if (value >= sorted[sorted.length - 1]?.value) {
    const activeEnd = ((value - min) / range) * 100;
    // Mark all segments as active
    return segments.map(([end, color]) => [end, color.replace('33', '')]);
  }

  return segments;
}

/**
 * Pick the color for the active segment based on current value.
 */
function getActiveColor(
  thresholds: GaugeThreshold[],
  value: number
): string {
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  for (const t of sorted) {
    if (value < t.value) {
      return t.color;
    }
  }
  return sorted[sorted.length - 1]?.color ?? '#52c41a';
}

// ============ Component ============

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  title,
  height = 300,
  max = 100,
  min = 0,
  unit,
  thresholds = DEFAULT_THRESHOLDS,
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (value === undefined || value === null) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const activeColor = getActiveColor(thresholds, value);
    const pct = ((value - min) / (max - min)) * 100;

    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'center',
            bottom: 0,
            textStyle: {
              fontSize: 14,
              color: textColor,
              fontFamily: FONT_FAMILY,
            },
          }
        : undefined,
      series: [
        {
          type: 'gauge',
          center: ['50%', '55%'],
          radius: '85%',
          startAngle: 210,
          endAngle: -30,
          min,
          max,
          splitNumber: 10,
          axisLine: {
            show: true,
            lineStyle: {
              width: 18,
              color: [
                [pct / 100, activeColor],
                [1, token.colorFillSecondary],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '70%',
            width: 6,
            offsetCenter: [0, '-10%'],
            itemStyle: {
              color: activeColor,
            },
          },
          axisTick: {
            length: 8,
            lineStyle: {
              color: token.colorBorderSecondary,
              width: 1,
            },
          },
          splitLine: {
            length: 20,
            lineStyle: {
              color: token.colorBorderSecondary,
              width: 2,
            },
          },
          axisLabel: {
            distance: 20,
            color: token.colorTextSecondary,
            fontSize: 12,
            fontFamily: FONT_FAMILY,
            formatter: (val: number) => {
              if (unit) {
                return `${val}${unit}`;
              }
              return `${val}`;
            },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 20,
            itemStyle: {
              borderWidth: 2,
              borderColor: activeColor,
              color: activeColor,
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            fontSize: 32,
            fontWeight: 'bold',
            color: textColor,
            fontFamily: FONT_FAMILY,
            offsetCenter: [0, '60%'],
            formatter: (val: number) => {
              if (unit) {
                return `${val}${unit}`;
              }
              return `${val}`;
            },
          },
          data: [
            {
              value,
            },
          ],
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicInOut',
    };
  }, [value, title, max, min, unit, thresholds, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default GaugeChart;