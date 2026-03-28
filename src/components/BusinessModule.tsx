import React, { useState, useMemo } from 'react';
import { Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { GlobalFilter, TimeFilter, KPIItem } from '../types';
import { formatKPI } from '../utils/format';
import {
  chartPalette,
  chartSeries,
  chartAxis,
  chartLegend,
  chartTooltip,
  buildXAxisLabelDensity,
} from '../utils/chartTheme';
import { getBusinessKPIs, getScaleTrendData, getCompletionTrendData, getCreditStageTrendData, getDrawdownTrendData } from '../mock/data';

interface Props {
  globalFilter: GlobalFilter;
}

const BusinessModule: React.FC<Props> = ({ globalFilter }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({ type: 'cumulative' });
  const [activeKPI, setActiveKPI] = useState<string>('newBalance');
  const [creditStage, setCreditStage] = useState<'1' | '2' | '3'>('1');

  const kpis = useMemo(() => getBusinessKPIs(globalFilter), [globalFilter]);
  const scaleTrend = useMemo(() => getScaleTrendData(timeFilter.type, 30, globalFilter), [timeFilter.type, globalFilter]);
  const completionTrend = useMemo(() => getCompletionTrendData(timeFilter.type, 30, globalFilter), [timeFilter.type, globalFilter]);
  const creditStageTrend = useMemo(() => getCreditStageTrendData(timeFilter.type, 30, globalFilter), [timeFilter.type, globalFilter]);
  const drawdownTrend = useMemo(() => getDrawdownTrendData(timeFilter.type, 30, globalFilter), [timeFilter.type, globalFilter]);

  const scaleMetricKeys = ['newBalance', 'balance', 'loanCount', 'balanceWeightedRate'];
  const activeScaleMetric = scaleMetricKeys.includes(activeKPI) ? activeKPI : 'newBalance';

  const completionMetricKeys = ['scanRegisterCount', 'realNameCompletedCount', 'completeCount'];
  const activeCompletionMetric = completionMetricKeys.includes(activeKPI) ? activeKPI : 'completeCount';

  const creditMetricKeys = [
    'stage1CreditSuccessCount',
    'stage1CreditSuccessAmount',
    'stage1CreditWeightedRate',
    'stage2CreditSuccessCount',
    'stage2CreditSuccessAmount',
    'stage2CreditWeightedRate',
    'stage3CreditSuccessCount',
    'stage3CreditSuccessAmount',
    'stage3CreditWeightedRate',
  ];
  const creditStageMetricKeyMap: Record<'1' | '2' | '3', string[]> = {
    '1': ['stage1CreditSuccessCount', 'stage1CreditSuccessAmount', 'stage1CreditWeightedRate'],
    '2': ['stage2CreditSuccessCount', 'stage2CreditSuccessAmount', 'stage2CreditWeightedRate'],
    '3': ['stage3CreditSuccessCount', 'stage3CreditSuccessAmount', 'stage3CreditWeightedRate'],
  };
  const visibleCreditMetricKeys = creditStageMetricKeyMap[creditStage];
  const activeCreditMetric =
    creditMetricKeys.includes(activeKPI) && visibleCreditMetricKeys.includes(activeKPI)
      ? activeKPI
      : visibleCreditMetricKeys[0];

  const drawdownMetricKeys = ['drawdownInitiatedCount', 'drawdownSuccessCount', 'drawdownAmount', 'drawdownWeightedRate'];
  const activeDrawdownMetric = drawdownMetricKeys.includes(activeKPI) ? activeKPI : 'drawdownInitiatedCount';
  const formatAbsoluteDeltaByUnit = (value: number, unit: KPIItem['unit']) => {
    const absValue = Math.abs(value);
    if (unit === 'percent') {
      return `${(absValue * 100).toFixed(2)}%`;
    }
    if (unit === 'count') {
      return `${Math.round(absValue).toLocaleString()}人`;
    }
    return formatKPI(absValue, 'amount');
  };

  const formatGrowthAbsolute = (currentValue: number, ratio: number, unit: KPIItem['unit']) => {
    if (Math.abs(1 + ratio) < 1e-9) {
      return '--';
    }

    const baseValue = currentValue / (1 + ratio);
    const delta = currentValue - baseValue;
    return formatAbsoluteDeltaByUnit(delta, unit);
  };

  const metricFormulaMap: Record<string, string> = {
    newBalance: '统计周期新增余额',
    balance: '剩余未还本金总和',
    loanCount: '当期余额为正人数',
    balanceWeightedRate: '余额加权利率=Σ(在贷余额×执行利率)/Σ在贷余额',

    scanRegisterCount: '统计期内扫码注册成功人数（按客户去重）',
    realNameCompletedCount: '完成实名OCR认证的人数，去重',
    completeCount: '授信申请订单提交（提交审批）人数',

    stage1CreditSuccessCount: '1段点击额度确认后，终审通过人数，去重',
    stage1CreditSuccessAmount: '1段点击额度确认后，终审通过的授信金额，不去重',
    stage1CreditWeightedRate: '∑（单笔授信金额*授信利率）/授信总金额',
    stage2CreditSuccessCount: '2段点击额度确认后，终审通过人数，去重',
    stage2CreditSuccessAmount: '2段点击额度确认后，终审通过的授信金额，不去重',
    stage2CreditWeightedRate: '∑（单笔授信金额*授信利率）/授信总金额',
    stage3CreditSuccessCount: '3段点击额度确认后，终审通过人数，去重',
    stage3CreditSuccessAmount: '3段点击额度确认后，终审通过的授信金额，不去重',
    stage3CreditWeightedRate: '∑（单笔授信金额*授信利率）/授信总金额',

    drawdownInitiatedCount: '提交动支申请的人数，去重',
    drawdownSuccessCount: '成功动支的人数，去重',
    drawdownAmount: '放款成功的总金额',
    drawdownWeightedRate: '∑（单笔动支金额*动支利率）/动支总金额',
  };

  const getMetricFormula = (metricKey: string) => metricFormulaMap[metricKey] ?? '统计口径待补充';

  const renderChartTitle = (title: string, formula: string) => (
    <div className="chart-title chart-title-inline-logic">
      <span className="chart-title-main">{title}</span>
      <span className="chart-title-logic">统计口径：{formula}</span>
    </div>
  );

  const renderTrendChange = (label: string, value: number) => (
    <span className={`kpi-change ${value >= 0 ? 'up' : 'down'}`}>
      <span className="kpi-change-label">{label}</span>
      <span className="kpi-change-value">
        {value >= 0 ? '↑' : '↓'} {Math.abs(value * 100).toFixed(2)}%
      </span>
    </span>
  );

  const renderKpiValue = (kpi: KPIItem) => {
    if (kpi.key === 'completeCount' && kpi.unit === 'count') {
      return (
        <div className="kpi-value-row">
          <span className="kpi-value-main">{kpi.value.toLocaleString()}</span>
          <span className="kpi-value-unit">(人)</span>
        </div>
      );
    }

    return <div className="kpi-value">{formatKPI(kpi.value, kpi.unit)}</div>;
  };

  const renderKpiCard = (kpi: KPIItem) => {
    const isActive = activeKPI === kpi.key;
    return (
      <div
        key={kpi.key}
        className={`kpi-card ${isActive ? 'active' : ''}`}
        onClick={() => setActiveKPI(kpi.key)}
      >
        <div className="kpi-name">{kpi.name}</div>
        {renderKpiValue(kpi)}
        <div className="kpi-meta-row">
          <div className="kpi-meta-line">
            {renderTrendChange('月同比', kpi.yoyChange)}
            <span className={`kpi-delta ${kpi.yoyChange >= 0 ? 'up' : 'down'}`}>
              <span className="kpi-change-label">月同比增长</span>
              <span className="kpi-change-value">{formatGrowthAbsolute(kpi.value, kpi.yoyChange, kpi.unit)}</span>
            </span>
          </div>
          <div className="kpi-meta-line">
            {renderTrendChange('周环比', kpi.momChange)}
            <span className={`kpi-delta ${kpi.momChange >= 0 ? 'up' : 'down'}`}>
              <span className="kpi-change-label">周环比增长</span>
              <span className="kpi-change-value">{formatGrowthAbsolute(kpi.value, kpi.momChange, kpi.unit)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const completionKpis = kpis.filter((k) => k.group === 'B');
  const creditStageKpis = kpis.filter((k) => k.group === 'C' && visibleCreditMetricKeys.includes(k.key));

  const getYoYLag = (type: TimeFilter['type']) => {
    if (type === 'cumulative' || type === 'month') return 12;
    if (type === 'week') return 4;
    if (type === 'week7') return 7;
    if (type === 'year') return 1;
    return 12;
  };

  const formatChangePercent = (current: number, base: number | undefined) => {
    if (base === undefined || Math.abs(base) < 1e-9) return '--';
    const change = (current - base) / Math.abs(base);
    const sign = change >= 0 ? '+' : '';
    return `${sign}${(change * 100).toFixed(2)}%`;
  };

  const buildTrendTooltipFormatter = (
    data: number[],
    valueFormatter: (value: number) => string,
    yoyLag: number = getYoYLag(timeFilter.type)
  ) => {
    return (params: any) => {
      const point = params?.[0];
      if (!point) return '';

      const dataIndex = point.dataIndex as number;
      const currentValue = data[dataIndex];
      const momBase = dataIndex > 0 ? data[dataIndex - 1] : undefined;
      const yoyBase = dataIndex >= yoyLag ? data[dataIndex - yoyLag] : undefined;

      return [
        `${point.axisValue}`,
        `${point.marker} ${point.seriesName}: ${valueFormatter(currentValue)}`,
        `周环比: ${formatChangePercent(currentValue, momBase)}`,
        `月同比: ${formatChangePercent(currentValue, yoyBase)}`,
      ].join('<br/>');
    };
  };

  // ============ 按组渲染 KPI 和图表 ============
  const renderGroupA = () => (
    <>
      <div className="chart-section-title">核心经营指标</div>
      <div className="group-section">
        <div className="kpi-area">
          <div className="kpi-grid">{kpis.filter((k) => k.group === 'A').map(renderKpiCard)}</div>
        </div>
        <div className="chart-area">
          <div className="chart-card">
            {renderChartTitle(scaleTitle, getMetricFormula(activeScaleMetric))}
            <ReactECharts option={scaleOption} style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </>
  );

  const renderGroupB = () => (
    <>
      <div className="chart-section-title">完件指标</div>
      <div className="group-section">
        <div className="kpi-area">
          <div className={`kpi-grid ${completionKpis.length === 3 ? 'kpi-grid-three' : ''}`}>
            {completionKpis.map(renderKpiCard)}
          </div>
        </div>
        <div className="chart-area">
          <div className="chart-card">
            {renderChartTitle(completionTitle, getMetricFormula(activeCompletionMetric))}
            <ReactECharts option={completionTrendOption} style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </>
  );

  const renderGroupC = () => (
    <>
      <div className="chart-section-header">
        <div className="chart-section-title">授信指标</div>
        <div className="credit-stage-filter">
          <Radio.Group
            value={creditStage}
            onChange={(e) => setCreditStage(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="1">1段</Radio.Button>
            <Radio.Button value="2">2段</Radio.Button>
            <Radio.Button value="3">3段</Radio.Button>
          </Radio.Group>
        </div>
      </div>
      <div className="group-section">
        <div className="kpi-area">
          <div className={`kpi-grid ${creditStageKpis.length === 3 ? 'kpi-grid-three' : ''}`}>
            {creditStageKpis.map(renderKpiCard)}
          </div>
        </div>
        <div className="chart-area">
          <div className="chart-card">
            {renderChartTitle(creditTitle, getMetricFormula(activeCreditMetric))}
            <ReactECharts option={creditTrendOption} style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </>
  );

  const renderGroupD = () => (
    <>
      <div className="chart-section-title">动支指标</div>
      <div className="group-section">
        <div className="kpi-area">
          <div className="kpi-grid">{kpis.filter((k) => k.group === 'D').map(renderKpiCard)}</div>
        </div>
        <div className="chart-area">
          <div className="chart-card">
            {renderChartTitle(drawdownTitle, getMetricFormula(activeDrawdownMetric))}
            <ReactECharts option={drawdownTrendOption} style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </>
  );

  // ============ 规模趋势图 ============
  const scaleMetricConfig: Record<string, {
    title: string;
    yAxisName: string;
    type: 'line';
    color: string;
    data: number[];
    formatter: (value: number) => string;
  }> = {
    newBalance: {
      title: '新增余额趋势',
      yAxisName: '新增(万元)',
      type: 'line',
      color: chartPalette.green700,
      data: scaleTrend.newBalance,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    balance: {
      title: '在贷余额趋势',
      yAxisName: '余额(万元)',
      type: 'line',
      color: chartPalette.green400,
      data: scaleTrend.balance,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    loanCount: {
      title: '在贷人数趋势',
      yAxisName: '人数(万)',
      type: 'line',
      color: chartPalette.mint500,
      data: scaleTrend.loanCount,
      formatter: (v) => `${v}`,
    },
    balanceWeightedRate: {
      title: '余额加权利率趋势',
      yAxisName: '利率(%)',
      type: 'line',
      color: chartPalette.green900,
      data: scaleTrend.balanceRate,
      formatter: (v) => `${(v * 100).toFixed(2)}%`,
    },
  };

  const selectedScaleMetric = scaleMetricConfig[activeScaleMetric];
  const scaleTitle = selectedScaleMetric.title;

  const scaleOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      ...chartTooltip,
      formatter: buildTrendTooltipFormatter(selectedScaleMetric.data, selectedScaleMetric.formatter),
    },
    legend: { data: [scaleTitle.replace('趋势', '')], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: scaleTrend.xAxis,
      axisLabel: buildXAxisLabelDensity(scaleTrend.xAxis.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: selectedScaleMetric.yAxisName,
      position: 'left' as const,
      axisLabel: { formatter: (v: number) => selectedScaleMetric.formatter(v) },
      ...chartAxis,
    },
    series: [
      {
        name: scaleTitle.replace('趋势', ''),
        type: selectedScaleMetric.type,
        data: selectedScaleMetric.data,
        smooth: true,
        itemStyle: {
          color: selectedScaleMetric.color,
        },
        lineStyle: { width: 2 },
        showSymbol: false,
      },
    ],
  };

  // ============ 完件趋势图（按左侧指标切换） ============
  const completionMetricConfig: Record<string, {
    title: string;
    yAxisName: string;
    type: 'line';
    color: string;
    data: number[];
    formatter: (value: number) => string;
  }> = {
    scanRegisterCount: {
      title: '扫码注册人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green700,
      data: completionTrend.scanRegisterCount,
      formatter: (v) => `${v}`,
    },
    realNameCompletedCount: {
      title: '实名完成人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green600,
      data: completionTrend.realNameCompletedCount,
      formatter: (v) => `${v}`,
    },
    completeCount: {
      title: '完件人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green400,
      data: completionTrend.completeCount,
      formatter: (v) => `${v}`,
    },
  };
  const selectedCompletionMetric = completionMetricConfig[activeCompletionMetric];
  const completionTitle = selectedCompletionMetric.title;

  const completionTrendOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      ...chartTooltip,
      formatter: buildTrendTooltipFormatter(selectedCompletionMetric.data, selectedCompletionMetric.formatter),
    },
    legend: { data: [completionTitle.replace('趋势', '')], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: completionTrend.xAxis,
      axisLabel: buildXAxisLabelDensity(completionTrend.xAxis.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: selectedCompletionMetric.yAxisName,
      position: 'left' as const,
      axisLabel: { formatter: (v: number) => selectedCompletionMetric.formatter(v) },
      ...chartAxis,
    },
    series: [
      {
        name: completionTitle.replace('趋势', ''),
        type: selectedCompletionMetric.type,
        data: selectedCompletionMetric.data,
        smooth: true,
        itemStyle: {
          color: selectedCompletionMetric.color,
        },
        lineStyle: { width: 2 },
        showSymbol: false,
      },
    ],
  };

  // ============ 授信趋势图（按左侧指标切换） ============
  const creditMetricConfig: Record<string, {
    title: string;
    yAxisName: string;
    type: 'line';
    color: string;
    data: number[];
    formatter: (value: number) => string;
  }> = {
    stage1CreditSuccessCount: {
      title: '1段授信成功人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green700,
      data: creditStageTrend.stage1Count,
      formatter: (v) => `${v}`,
    },
    stage1CreditSuccessAmount: {
      title: '1段授信成功金额趋势',
      yAxisName: '金额(万元)',
      type: 'line',
      color: chartPalette.green400,
      data: creditStageTrend.stage1Amount,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    stage1CreditWeightedRate: {
      title: '1段授信加权利率趋势',
      yAxisName: '利率(%)',
      type: 'line',
      color: chartPalette.mint500,
      data: creditStageTrend.stage1Rate,
      formatter: (v) => `${(v * 100).toFixed(2)}%`,
    },

    stage2CreditSuccessCount: {
      title: '2段授信成功人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green700,
      data: creditStageTrend.stage2Count,
      formatter: (v) => `${v}`,
    },
    stage2CreditSuccessAmount: {
      title: '2段授信成功金额趋势',
      yAxisName: '金额(万元)',
      type: 'line',
      color: chartPalette.green400,
      data: creditStageTrend.stage2Amount,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    stage2CreditWeightedRate: {
      title: '2段授信加权利率趋势',
      yAxisName: '利率(%)',
      type: 'line',
      color: chartPalette.mint500,
      data: creditStageTrend.stage2Rate,
      formatter: (v) => `${(v * 100).toFixed(2)}%`,
    },

    stage3CreditSuccessCount: {
      title: '3段授信成功人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green700,
      data: creditStageTrend.stage3Count,
      formatter: (v) => `${v}`,
    },
    stage3CreditSuccessAmount: {
      title: '3段授信成功金额趋势',
      yAxisName: '金额(万元)',
      type: 'line',
      color: chartPalette.green400,
      data: creditStageTrend.stage3Amount,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    stage3CreditWeightedRate: {
      title: '3段授信加权利率趋势',
      yAxisName: '利率(%)',
      type: 'line',
      color: chartPalette.mint500,
      data: creditStageTrend.stage3Rate,
      formatter: (v) => `${(v * 100).toFixed(2)}%`,
    },
  };
  const selectedCreditMetric = creditMetricConfig[activeCreditMetric];
  const creditTitle = selectedCreditMetric.title;

  const creditTrendOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      ...chartTooltip,
      formatter: buildTrendTooltipFormatter(selectedCreditMetric.data, selectedCreditMetric.formatter),
    },
    legend: { data: [creditTitle.replace('趋势', '')], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: creditStageTrend.xAxis,
      axisLabel: buildXAxisLabelDensity(creditStageTrend.xAxis.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: selectedCreditMetric.yAxisName,
      position: 'left' as const,
      axisLabel: { formatter: (v: number) => selectedCreditMetric.formatter(v) },
      ...chartAxis,
    },
    series: [
      {
        name: creditTitle.replace('趋势', ''),
        type: selectedCreditMetric.type,
        data: selectedCreditMetric.data,
        smooth: true,
        itemStyle: {
          color: selectedCreditMetric.color,
        },
        lineStyle: { width: 2 },
        showSymbol: false,
      },
    ],
  };

  // ============ 动支趋势图（按左侧指标切换） ============
  const drawdownMetricConfig: Record<string, {
    title: string;
    yAxisName: string;
    type: 'line';
    color: string;
    data: number[];
    formatter: (value: number) => string;
  }> = {
    drawdownInitiatedCount: {
      title: '发起动支人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green700,
      data: drawdownTrend.initiatedCount,
      formatter: (v) => `${v}`,
    },
    drawdownSuccessCount: {
      title: '动支成功人数趋势',
      yAxisName: '人数(万人)',
      type: 'line',
      color: chartPalette.green600,
      data: drawdownTrend.successCount,
      formatter: (v) => `${v}`,
    },
    drawdownAmount: {
      title: '动支金额趋势',
      yAxisName: '金额(万元)',
      type: 'line',
      color: chartPalette.green400,
      data: drawdownTrend.amount,
      formatter: (v) => `${Math.round(v * 10000).toLocaleString()}`,
    },
    drawdownWeightedRate: {
      title: '动支加权利率趋势',
      yAxisName: '利率(%)',
      type: 'line',
      color: chartPalette.green900,
      data: drawdownTrend.rate,
      formatter: (v) => `${(v * 100).toFixed(2)}%`,
    },
  };
  const selectedDrawdownMetric = drawdownMetricConfig[activeDrawdownMetric];
  const drawdownTitle = selectedDrawdownMetric.title;

  const drawdownTrendOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      ...chartTooltip,
      formatter: buildTrendTooltipFormatter(selectedDrawdownMetric.data, selectedDrawdownMetric.formatter),
    },
    legend: { data: [drawdownTitle.replace('趋势', '')], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: drawdownTrend.xAxis,
      axisLabel: buildXAxisLabelDensity(drawdownTrend.xAxis.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: selectedDrawdownMetric.yAxisName,
      position: 'left' as const,
      axisLabel: { formatter: (v: number) => selectedDrawdownMetric.formatter(v) },
      ...chartAxis,
    },
    series: [
      {
        name: drawdownTitle.replace('趋势', ''),
        type: selectedDrawdownMetric.type,
        data: selectedDrawdownMetric.data,
        smooth: true,
        itemStyle: {
          color: selectedDrawdownMetric.color,
        },
        lineStyle: { width: 2 },
        showSymbol: false,
      },
    ],
  };

  return (
    <div className="business-module">
      {/* 时间筛选器 */}
      <div className="time-filter-bar">
        <div className="time-filter-title">时间范围</div>
        <Radio.Group
          className="business-time-radio"
          value={timeFilter.type}
          onChange={(e) => setTimeFilter({ type: e.target.value })}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="cumulative">累计</Radio.Button>
          <Radio.Button value="year">当年</Radio.Button>
          <Radio.Button value="month">当月</Radio.Button>
          <Radio.Button value="week7">近7天</Radio.Button>
          <Radio.Button value="week">本周</Radio.Button>
        </Radio.Group>
      </div>

      {/* 各分组 KPI + 图表 */}
      {renderGroupA()}
      {renderGroupB()}
      {renderGroupC()}
      {renderGroupD()}
    </div>
  );
};

export default BusinessModule;
