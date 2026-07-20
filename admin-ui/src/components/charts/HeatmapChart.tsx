import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { theme } from 'antd';

// ============ Types ============

export interface HeatmapDataPoint {
  /** X 轴坐标值 */
  x: string;
  /** Y 轴坐标值 */
  y: string;
  /** 数值 */
  value: number;
}

export interface HeatmapChartProps {
  /** 数据数组 */
  data: HeatmapDataPoint[];
  /** 图表标题 */
  title?: string;
  /** 图表高度（px），默认 400 */
  height?: number;
  /** X 轴标签列表（用于排序），默认从 data 中自动提取 */
  xLabels?: string[];
  /** Y 轴标签列表（用于排序），默认从 data 中自动提取 */
  yLabels?: string[];
  /** 颜色范围，默认 ['#f0f5ff', '#1677ff'] */
  colorRange?: [string, string];
}

// ============ Constants ============

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans CJK SC', sans-serif";

const DEFAULT_COLOR_RANGE: [string, string] = ['#f0f5ff', '#1677ff'];

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

const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data = [],
  title,
  height = 400,
  xLabels,
  yLabels,
  colorRange = DEFAULT_COLOR_RANGE,
}) => {
  const { token } = theme.useToken();

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return EMPTY_OPTION;
    }

    const textColor = token.colorText;
    const borderColor = token.colorBorderSecondary;

    // Determine x/y labels: use provided or derive from data
    const xLabelsDerived =
      xLabels ?? Array.from(new Set(data.map((d) => d.x))).sort();
    const yLabelsDerived =
      yLabels ?? Array.from(new Set(data.map((d) => d.y))).sort();

    // Build a lookup map for quick value access
    const valueMap = new Map<string, number>();
    data.forEach((d) => {
      valueMap.set(`${d.x}::${d.y}`, d.value);
    });

    // Build the 2D array for heatmap: rows = yLabels, columns = xLabels
    const heatmapData: Array<[number, number, number]> = [];
    let minVal = Infinity;
    let maxVal = -Infinity;

    yLabelsDerived.forEach((y, yIdx) => {
      xLabelsDerived.forEach((x, xIdx) => {
        const val = valueMap.get(`${x}::${y}`) ?? 0;
        heatmapData.push([xIdx, yIdx, val]);
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      });
    });

    // If all values are the same, set a small range to avoid visual issues
    if (minVal === maxVal) {
      minVal = minVal - 0.5;
      maxVal = maxVal + 0.5;
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
        backgroundColor: token.colorBgElevated,
        borderColor: borderColor,
        textStyle: { color: textColor, fontFamily: FONT_FAMILY },
        formatter: (params: any) => {
          const x = xLabelsDerived[params.value[0]];
          const y = yLabelsDerived[params.value[1]];
          const v = params.value[2];
          return `${x} - ${y}<br/>${params.marker} ${v}`;
        },
      },
      grid: {
        left: 100,
        right: 60,
        top: title ? 50 : 20,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: xLabelsDerived,
        position: 'bottom',
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
          rotate: xLabelsDerived.length > 10 ? 45 : 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yLabelsDerived,
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
        },
        splitLine: { show: false },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: colorRange,
        },
        textStyle: {
          color: textColor,
          fontFamily: FONT_FAMILY,
        },
        itemWidth: 14,
        itemHeight: 140,
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            color: textColor,
            fontFamily: FONT_FAMILY,
            fontSize: 11,
            formatter: (params: any) => {
              const val = params.value[2];
              // Show label only if value is non-zero or significant
              return val !== 0 ? `${val}` : '';
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          itemStyle: {
            borderColor: token.colorBgContainer,
            borderWidth: 2,
            borderRadius: 2,
          },
        },
      ],
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, title, xLabels, yLabels, colorRange, token]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
      lazyUpdate
    />
  );
};

export default HeatmapChart;