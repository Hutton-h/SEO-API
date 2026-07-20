import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface RadarDataPoint {
  name: string;
  value: number;
}

export interface RadarSeriesData {
  name: string;
  data: RadarDataPoint[];
  color?: string;
}

export interface RadarChartProps {
  /**
   * 数据：
   * - 单系列：RadarDataPoint[]，如 [{ name: 'SEO', value: 85 }, ...]
   * - 多系列：RadarSeriesData[]，如 [{ name: '本周', data: [...] }, { name: '上周', data: [...] }]
   */
  data: RadarDataPoint[] | RadarSeriesData[];
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 400 */
  height?: number;
  /** 最大值（用于统一刻度），默认自动计算 */
  maxValue?: number;
  /** 雷达图形状：circle 圆形，polygon 多边形 */
  shape?: 'circle' | 'polygon';
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
  radar: { indicator: [] },
  series: [],
};

// ============ Helpers ============

function isMultiSeries(
  data: RadarDataPoint[] | RadarSeriesData[]
): data is RadarSeriesData[] {
  if (data.length === 0) return false;
  return Array.isArray((data[0] as RadarSeriesData).data);
}

function normalizeToMultiSeries(
  data: RadarDataPoint[] | RadarSeriesData[]
): RadarSeriesData[] {
  if (isMultiSeries(data)) {
    return data;
  }
  return [{ name: '', data: data as RadarDataPoint[] }];
}

// ============ Component ============

const RadarChart: React.FC<RadarChartProps> = ({
  data = [],
  title,
  height = 400,
  maxValue,
  shape = 'polygon',
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const borderColor = token.colorBorderSecondary;

    const seriesList = normalizeToMultiSeries(data);

    // Collect all unique indicator names
    const indicatorNameSet = new Set<string>();
    seriesList.forEach((s) => {
      s.data.forEach((d) => indicatorNameSet.add(d.name));
    });
    const indicatorNames = Array.from(indicatorNameSet);

    // Build indicators
    const indicators = indicatorNames.map((name) => ({
      name,
      max: maxValue,
    }));

    // Build series
    const series = seriesList.map((s, idx) => {
      const seriesColor = s.color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length];
      const values = indicatorNames.map((name) => {
        const found = s.data.find((d) => d.name === name);
        return found ? found.value : 0;
      });

      return {
        name: s.name,
        type: 'radar' as const,
        data: [
          {
            value: values,
            name: s.name,
          },
        ],
        symbol: 'circle' as const,
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: seriesColor,
        },
        itemStyle: {
          color: seriesColor,
        },
        areaStyle: {
          color: `${seriesColor}22`,
        },
        emphasis: {
          lineStyle: {
            width: 3,
          },
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'center',
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
        borderColor: borderColor,
        textStyle: { color: textColor, fontFamily: FONT_FAMILY },
      },
      legend: seriesList.length > 1 && seriesList[0].name !== ''
        ? {
            bottom: 0,
            data: seriesList.map((s) => s.name),
            textStyle: {
              color: textColor,
              fontFamily: FONT_FAMILY,
            },
            icon: 'roundRect',
          }
        : undefined,
      radar: {
        center: ['50%', '52%'],
        radius: '65%',
        indicator: indicators,
        shape,
        axisName: {
          color: textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: [
              token.colorFillAlter,
              token.colorBgContainer,
            ],
          },
        },
        splitLine: {
          lineStyle: {
            color: borderColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: borderColor,
          },
        },
      },
      series,
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, title, maxValue, shape, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default RadarChart;