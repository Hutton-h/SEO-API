import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface ComparisonDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface ComparisonChartProps {
  /** 数据数组 */
  data: ComparisonDataPoint[];
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 400 */
  height?: number;
  /** 是否水平柱状图，默认 false（垂直） */
  horizontal?: boolean;
  /** 默认柱状图颜色 */
  color?: string;
  /** 数值单位 */
  unit?: string;
  /** 是否显示数值标签，默认 true */
  showLabel?: boolean;
}

// ============ Constants ============

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans CJK SC', sans-serif";

const COLOR_PALETTE = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#ff4d4f',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
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
  xAxis: { show: false },
  yAxis: { show: false },
  series: [],
};

// ============ Component ============

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data = [],
  title,
  height = 400,
  horizontal = false,
  color,
  unit,
  showLabel = true,
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const borderColor = token.colorBorderSecondary;
    const axisColor = token.colorTextQuaternary;

    const sortedData = [...data].sort((a, b) => b.value - a.value);

    const names = sortedData.map((d) => d.name);
    const values = sortedData.map((d) => d.value);
    const colors = sortedData.map(
      (d, idx) => d.color ?? color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length]
    );

    const categoryAxis = {
      type: 'category' as const,
      data: names,
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontFamily: FONT_FAMILY,
        interval: 0,
        rotate: horizontal ? 0 : names.length > 8 ? 30 : 0,
        overflow: 'truncate',
        width: horizontal ? undefined : 80,
      },
    };

    const valueAxis = {
      type: 'value' as const,
      name: unit,
      nameTextStyle: {
        color: textColor,
        fontFamily: FONT_FAMILY,
      },
      axisLabel: {
        color: textColor,
        fontFamily: FONT_FAMILY,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed' as const,
        },
      },
    };

    const xAxis = horizontal ? valueAxis : categoryAxis;
    const yAxis = horizontal ? categoryAxis : valueAxis;

    // For horizontal charts, we need to reverse yAxis data
    if (horizontal) {
      (yAxis as any).inverse = true;
      yAxis.axisLabel = {
        ...(yAxis.axisLabel as any),
        rotate: 0,
      };
    }

    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'left',
            textStyle: {
              fontSize: 16,
              fontWeight: 600,
              color: textColor,
              fontFamily: FONT_FAMILY,
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: horizontal ? 'line' : 'shadow',
        },
        backgroundColor: token.colorBgElevated,
        borderColor: borderColor,
        textStyle: { color: textColor, fontFamily: FONT_FAMILY },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/>${p.marker} ${p.value}${unit ?? ''}`;
        },
      },
      grid: {
        left: horizontal ? 120 : 50,
        right: horizontal ? 40 : 20,
        top: title ? 50 : 20,
        bottom: horizontal ? 20 : 60,
        containLabel: horizontal ? true : false,
      },
      xAxis,
      yAxis,
      series: [
        {
          type: 'bar',
          data: values.map((v, idx) => ({
            value: v,
            itemStyle: {
              color: colors[idx],
              borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
            },
          })),
          barWidth: horizontal ? 18 : Math.min(36, Math.max(16, 400 / data.length)),
          barMaxWidth: 40,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
          label: showLabel
            ? {
                show: true,
                position: horizontal ? 'right' : 'top',
                color: textColor,
                fontFamily: FONT_FAMILY,
                fontSize: 12,
                formatter: (params: any) => `${params.value}${unit ?? ''}`,
              }
            : undefined,
          animationDelay: (idx: number) => idx * 50,
        },
      ],
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, title, horizontal, color, unit, showLabel, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default ComparisonChart;