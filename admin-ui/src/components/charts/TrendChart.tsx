import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface TrendDataPoint {
  date: string;
  value: number;
  category?: string;
  [key: string]: string | number | undefined;
}

export interface TrendChartProps {
  /** 数据数组 */
  data: TrendDataPoint[];
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 400 */
  height?: number;
  /** 是否使用平滑曲线，默认 true */
  smooth?: boolean;
  /** 是否显示面积填充，默认 false */
  showArea?: boolean;
  /** X 轴字段名，默认 'date' */
  xField?: string;
  /** Y 轴字段名，默认 'value' */
  yField?: string;
  /** 自定义颜色（单系列时使用） */
  color?: string;
  /** 数值单位 */
  unit?: string;
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

const TrendChart: React.FC<TrendChartProps> = ({
  data = [],
  title,
  height = 400,
  smooth = true,
  showArea = false,
  xField = 'date',
  yField = 'value',
  color,
  unit,
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const borderColor = token.colorBorderSecondary;
    const axisColor = token.colorTextQuaternary;

    // Detect if data has category field for multi-series
    const hasCategory = data.some((d) => d.category !== undefined);

    if (hasCategory) {
      // Multi-series: group by category
      const categories = Array.from(
        new Set(data.map((d) => d.category ?? ''))
      );
      const dates = Array.from(new Set(data.map((d) => d[xField]))).sort();

      const series = categories.map((cat, idx) => {
        const catData = data.filter((d) => d.category === cat);
        const values = dates.map((date) => {
          const found = catData.find((d) => d[xField] === date);
          return found ? found[yField] : null;
        });

        return {
          name: cat,
          type: 'line' as const,
          data: values,
          smooth,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          },
          itemStyle: {
            color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    {
                      offset: 0,
                      color: `${COLOR_PALETTE[idx % COLOR_PALETTE.length]}33`,
                    },
                    {
                      offset: 1,
                      color: `${COLOR_PALETTE[idx % COLOR_PALETTE.length]}05`,
                    },
                  ],
                },
              }
            : undefined,
          emphasis: {
            focus: 'series',
          },
        };
      });

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
          backgroundColor: token.colorBgElevated,
          borderColor: borderColor,
          textStyle: { color: textColor, fontFamily: FONT_FAMILY },
          formatter: (params: any) => {
            if (!Array.isArray(params)) return '';
            let result = `${params[0].axisValue}<br/>`;
            params.forEach((p: any) => {
              const val = p.value !== null ? p.value : '-';
              result += `${p.marker} ${p.seriesName}: ${val}${unit ?? ''}<br/>`;
            });
            return result;
          },
        },
        legend: {
          data: categories,
          bottom: 0,
          textStyle: { color: textColor, fontFamily: FONT_FAMILY },
          icon: 'roundRect',
        },
        grid: {
          left: 50,
          right: 20,
          top: title ? 50 : 20,
          bottom: 40,
          containLabel: false,
        },
        xAxis: {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { lineStyle: { color: axisColor } },
          axisTick: { show: false },
          axisLabel: {
            color: textColor,
            fontFamily: FONT_FAMILY,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
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
              type: 'dashed',
            },
          },
        },
        series,
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut',
      };
    }

    // Single series
    const xData = data.map((d) => d[xField]);
    const yData = data.map((d) => d[yField]);
    const seriesColor = color ?? COLOR_PALETTE[0];

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
        backgroundColor: token.colorBgElevated,
        borderColor: borderColor,
        textStyle: { color: textColor, fontFamily: FONT_FAMILY },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}<br/>${p.marker} ${p.value}${unit ?? ''}`;
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: title ? 50 : 20,
        bottom: 20,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: axisColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontFamily: FONT_FAMILY,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
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
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'line',
          data: yData,
          smooth,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: seriesColor,
          },
          itemStyle: {
            color: seriesColor,
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${seriesColor}33` },
                    { offset: 1, color: `${seriesColor}05` },
                  ],
                },
              }
            : undefined,
          emphasis: {
            focus: 'series',
          },
        },
      ],
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, title, smooth, showArea, xField, yField, color, unit, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default TrendChart;