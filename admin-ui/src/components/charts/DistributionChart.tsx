import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface DistributionDataPoint {
  name: string;
  value: number;
  color?: string;
}

export type DistributionChartType = 'pie' | 'donut' | 'rose';

export interface DistributionChartProps {
  /** 数据数组 */
  data: DistributionDataPoint[];
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 400 */
  height?: number;
  /** 图表类型：pie 普通饼图，donut 环形图，rose 玫瑰图 */
  type?: DistributionChartType;
  /** 是否显示图例，默认 true */
  showLegend?: boolean;
  /** 中心文字，如 { label: '总计', value: '1,234' } */
  centerLabel?: {
    label?: string;
    value?: string;
  };
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
  series: [],
};

// ============ Component ============

const DistributionChart: React.FC<DistributionChartProps> = ({
  data = [],
  title,
  height = 400,
  type = 'pie',
  showLegend = true,
  centerLabel,
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const total = data.reduce((sum, d) => sum + d.value, 0);

    const seriesData = data.map((d, idx) => ({
      name: d.name,
      value: d.value,
      itemStyle: {
        color: d.color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length],
      },
    }));

    // Build series config based on type
    const radiusConfig: [string, string] =
      type === 'donut'
        ? ['50%', '75%']
        : type === 'rose'
        ? ['20%', '70%']
        : ['0%', '70%'];

    const roseType = type === 'rose' ? ('area' as const) : undefined;

    let center: [string, string] = ['50%', '50%'];
    if (showLegend) {
      center = ['50%', '55%'];
    }

    const series = [
      {
        type: 'pie' as const,
        radius: radiusConfig,
        center,
        roseType,
        data: seriesData,
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        label: {
          show: type !== 'rose',
          formatter: '{b}: {d}%',
          color: textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
        },
        labelLine: {
          lineStyle: {
            color: textColor,
          },
        },
        itemStyle: {
          borderRadius: type === 'donut' ? 4 : 0,
          borderColor: token.colorBgContainer,
          borderWidth: 2,
        },
      },
    ];

    // Build graphic elements for center label
    const graphic: any[] = [];
    if (centerLabel && (centerLabel.label || centerLabel.value)) {
      if (centerLabel.label) {
        graphic.push({
          type: 'text',
          left: 'center',
          top: '44%',
          style: {
            text: centerLabel.label,
            textAlign: 'center',
            fill: token.colorTextSecondary,
            fontSize: 13,
            fontFamily: FONT_FAMILY,
          },
        });
      }
      if (centerLabel.value) {
        graphic.push({
          type: 'text',
          left: 'center',
          top: centerLabel.label ? '50%' : '46%',
          style: {
            text: centerLabel.value,
            textAlign: 'center',
            fill: textColor,
            fontSize: 22,
            fontWeight: 'bold',
            fontFamily: FONT_FAMILY,
          },
        });
      }
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
        trigger: 'item',
        backgroundColor: token.colorBgElevated,
        borderColor: token.colorBorderSecondary,
        textStyle: { color: textColor, fontFamily: FONT_FAMILY },
        formatter: (params: any) => {
          const pct = ((params.value / total) * 100).toFixed(1);
          return `${params.marker} ${params.name}: ${params.value} (${pct}%)`;
        },
      },
      legend: showLegend
        ? {
            orient: 'horizontal',
            bottom: 0,
            textStyle: {
              color: textColor,
              fontFamily: FONT_FAMILY,
              fontSize: 12,
            },
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
          }
        : undefined,
      graphic: graphic.length > 0 ? graphic : undefined,
      series,
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, title, type, showLegend, centerLabel, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default DistributionChart;