export const chartPalette = {
  green900: '#16a34a',
  green800: '#22c55e',
  green700: '#22c55e',
  green600: '#34d399',
  green500: '#6ee7b7',
  green400: '#86efac',
  green300: '#bbf7d0',
  mint500: '#2dd4bf',
  lime500: '#84cc16',
  amber500: '#f97316',
  neutral500: '#94a3b8',
  neutral300: '#cbd5e1',
  danger500: '#dc2626',
};

export const chartSeries = [
  chartPalette.green900,
  chartPalette.mint500,
  chartPalette.green500,
  chartPalette.green600,
  chartPalette.green400,
  chartPalette.neutral500,
];

export const chartAxis = {
  axisLine: { lineStyle: { color: '#d7e0ea' } },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: '#eef2f6' } },
};

export const chartLegend = {
  textStyle: { color: '#64748b', fontWeight: 500, fontSize: 12 },
};

export const chartTooltip = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  borderColor: '#dbe2ea',
  borderWidth: 1,
  textStyle: { color: '#334155' },
  extraCssText: 'border-radius: 8px; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);',
};

export const buildXAxisLabelDensity = (total: number, maxVisible: number = 10) => {
  if (total <= maxVisible) {
    return { interval: 0, hideOverlap: true };
  }

  return {
    interval: Math.ceil(total / maxVisible) - 1,
    hideOverlap: true,
  };
};

export const areaStyleByColor = (color: string) => ({
  color: {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `${color}55` },
      { offset: 1, color: `${color}08` },
    ],
  },
});

export const vintageRateColor = (rate: number) => {
  if (rate > 0.05) return chartPalette.danger500;
  if (rate > 0.02) return chartPalette.amber500;
  return chartPalette.green900;
};

export const assetColorMap: Record<string, string> = {
  资产A: '#22c55e',
  资产B: '#34d399',
  资产C: '#2dd4bf',
  资产D: '#a3e635',
};
