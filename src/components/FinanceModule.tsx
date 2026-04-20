import React, { useMemo, useState } from 'react';
import { Select, Space, Table, Tabs } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { AssetDetail, FinancialMonthly, GlobalFilter } from '../types';
import { formatPercent, formatWan } from '../utils/format';
import {
  areaStyleByColor,
  chartAxis,
  chartLegend,
  chartPalette,
  chartSeries,
  chartTooltip,
  buildXAxisLabelDensity,
} from '../utils/chartTheme';
import { getAssetDetailData, getFinancialMonthlyData } from '../mock/data';

interface Props {
  globalFilter: GlobalFilter;
}

const fyOptions = [
  { label: 'FY2023', value: 'FY2023' },
  { label: 'FY2024', value: 'FY2024' },
  { label: 'FY2025', value: 'FY2025' },
];

const assetOptions = [
  { label: '资产A', value: '资产A' },
  { label: '资产B', value: '资产B' },
  { label: '资产C', value: '资产C' },
  { label: '资产D', value: '资产D' },
];

const assetMetricRows: Array<{ key: string; metric: string; getValue: (row: AssetDetail) => string }> = [
  { key: 'loanAmount', metric: '放款金额(万元)', getValue: (row) => formatWan(row.loanAmount) },
  { key: 'takeRate', metric: 'Take Rate', getValue: (row) => formatPercent(row.takeRate) },
  { key: 'profitIncome', metric: '分润收入(万元)', getValue: (row) => formatWan(row.profitIncome) },
  { key: 'balance', metric: '在贷余额(万元)', getValue: (row) => formatWan(row.balance) },
  { key: 'rateRange', metric: '利率区间', getValue: (row) => row.rateRange },
  { key: 'actualInterest', metric: '实收息费(万元)', getValue: (row) => formatWan(row.actualInterest) },
  { key: 'annualRiskLoss', metric: '年化风险损失率', getValue: (row) => formatPercent(row.annualRiskLoss) },
  { key: 'techDiscount', metric: '技术服务费折扣率', getValue: (row) => formatPercent(row.techDiscount) },
  { key: 'profitRatio', metric: '分润比例', getValue: (row) => formatPercent(row.profitRatio) },
  { key: 'nominalDuration', metric: '名义久期(月)', getValue: (row) => row.nominalDuration.toFixed(1) },
];

const assetCellMeta: Partial<Record<string, { pricing: string; discount: string }>> = {
  资产A: { pricing: '0.75', discount: '89%' },
};

const FinanceModule: React.FC<Props> = ({ globalFilter }) => {
  const [fy, setFy] = useState('FY2025');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([assetOptions[0].value]);

  const monthlyData = useMemo(() => getFinancialMonthlyData(globalFilter), [globalFilter]);
  const assetData = useMemo(() => getAssetDetailData(globalFilter), [globalFilter]);

  const filteredAssetData = useMemo(
    () => assetData.filter((d) => selectedAssets.includes(d.assetName)),
    [assetData, selectedAssets]
  );

  type AssetPivotRow = {
    key: string;
    assetName: string;
    metric: string;
    rowSpan: number;
    [month: string]: string | number;
  };

  const monthKeys = useMemo(() => {
    const keys = Array.from(new Set(filteredAssetData.map((row) => row.month)));
    return keys.sort((a, b) => Number(a.replace('M', '')) - Number(b.replace('M', '')));
  }, [filteredAssetData]);

  const assetPivotData = useMemo(() => {
    const assetMonthMap = new Map<string, Map<string, AssetDetail>>();
    filteredAssetData.forEach((row) => {
      const monthMap = assetMonthMap.get(row.assetName) ?? new Map<string, AssetDetail>();
      monthMap.set(row.month, row);
      assetMonthMap.set(row.assetName, monthMap);
    });

    const rows: AssetPivotRow[] = [];
    selectedAssets.forEach((assetName) => {
      const monthMap = assetMonthMap.get(assetName);
      if (!monthMap) return;

      assetMetricRows.forEach((metricRow, metricIndex) => {
        const row: AssetPivotRow = {
          key: `${assetName}-${metricRow.key}`,
          assetName,
          metric: metricRow.metric,
          rowSpan: metricIndex === 0 ? assetMetricRows.length : 0,
        };

        monthKeys.forEach((month) => {
          const cell = monthMap.get(month);
          row[month] = cell ? metricRow.getValue(cell) : '-';
        });

        rows.push(row);
      });
    });

    return rows;
  }, [filteredAssetData, selectedAssets, monthKeys]);

  const assetPivotColumns: ColumnsType<AssetPivotRow> = useMemo(
    () => [
      {
        title: '资产',
        dataIndex: 'assetName',
        key: 'assetName',
        width: 136,
        fixed: 'left',
        render: (_, record) => {
          const meta = assetCellMeta[record.assetName];

          return (
            <div className="asset-cell">
              <div className="asset-cell-name">{record.assetName}</div>
              {meta && (
                <div className="asset-cell-meta">
                  <div>定价：{meta.pricing}</div>
                  <div>折扣率：{meta.discount}</div>
                </div>
              )}
            </div>
          );
        },
        onCell: (record) => ({ rowSpan: record.rowSpan }),
      },
      { title: '指标', dataIndex: 'metric', key: 'metric', width: 180, fixed: 'left' },
      ...monthKeys.map((month) => ({
        title: month,
        dataIndex: month,
        key: month,
        width: 120,
      })),
    ],
    [monthKeys]
  );

  const selectedAssetTrendList = useMemo(() => {
    return selectedAssets.map((assetName) => {
      const rows = assetData.filter((row) => row.assetName === assetName);
      const trendMonthKeys = Array.from(new Set(rows.map((row) => row.month))).sort(
        (a, b) => Number(a.replace('M', '')) - Number(b.replace('M', ''))
      );

      const assetMonthlyTrendData = trendMonthKeys.map((month) => {
        const monthRows = rows.filter((row) => row.month === month);
        const loanAmount = monthRows.reduce((sum, row) => sum + row.loanAmount, 0);
        const balance = monthRows.reduce((sum, row) => sum + row.balance, 0);
        const expectedProfitIncome = monthRows.reduce((sum, row) => sum + row.profitIncome, 0);
        const weightedTakeRate =
          balance > 0 ? monthRows.reduce((sum, row) => sum + row.takeRate * row.balance, 0) / balance : 0;

        return {
          month,
          loanAmount,
          balance,
          expectedProfitIncome,
          takeRate: weightedTakeRate,
        };
      });

      const assetLoanBalanceTrendOption = {
        color: chartSeries,
        tooltip: {
          trigger: 'axis' as const,
          axisPointer: { type: 'line' as const },
          ...chartTooltip,
          formatter: (params: any) => {
            let s = params[0].axisValue + '<br/>';
            params.forEach((p: any) => {
              s += `${p.marker} ${p.seriesName}: ${(p.value / 1e4).toFixed(2)}万元<br/>`;
            });
            return s;
          },
        },
        legend: { data: ['放款金额', '在贷余额'], bottom: 0, ...chartLegend },
        grid: { left: 60, right: 60, top: 40, bottom: 40 },
        xAxis: {
          type: 'category' as const,
          data: trendMonthKeys,
          axisLabel: buildXAxisLabelDensity(trendMonthKeys.length),
          ...chartAxis,
        },
        yAxis: [
          {
            type: 'value' as const,
            name: '放款(万元)',
            position: 'left' as const,
            alignTicks: true,
            nameGap: 14,
            axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
            ...chartAxis,
          },
          {
            type: 'value' as const,
            name: '余额(万元)',
            position: 'right' as const,
            alignTicks: true,
            nameGap: 14,
            axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
            ...chartAxis,
          },
        ],
        series: [
          {
            name: '放款金额',
            type: 'line',
            data: assetMonthlyTrendData.map((d) => d.loanAmount),
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 3 },
            itemStyle: { color: chartPalette.green700 },
          },
          {
            name: '在贷余额',
            type: 'bar',
            yAxisIndex: 1,
            barWidth: 16,
            data: assetMonthlyTrendData.map((d) => d.balance),
            itemStyle: { color: chartPalette.green400, borderRadius: [5, 5, 0, 0] },
          },
        ],
      };

      const assetProfitTakeRateTrendOption = {
        color: chartSeries,
        tooltip: {
          trigger: 'axis' as const,
          axisPointer: { type: 'shadow' as const },
          ...chartTooltip,
          formatter: (params: any) => {
            let s = params[0].axisValue + '<br/>';
            params.forEach((p: any) => {
              if (p.seriesName === 'Take Rate') {
                s += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
              } else {
                s += `${p.marker} ${p.seriesName}: ${(p.value / 1e4).toFixed(0)}万元<br/>`;
              }
            });
            return s;
          },
        },
        legend: { data: ['预分润收入', 'Take Rate'], bottom: 0, ...chartLegend },
        grid: { left: 60, right: 60, top: 40, bottom: 40 },
        xAxis: {
          type: 'category' as const,
          data: trendMonthKeys,
          axisLabel: buildXAxisLabelDensity(trendMonthKeys.length),
          ...chartAxis,
        },
        yAxis: [
          {
            type: 'value' as const,
            name: '预分润收入(万元)',
            position: 'left' as const,
            alignTicks: true,
            nameGap: 14,
            axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
            ...chartAxis,
          },
          {
            type: 'value' as const,
            name: 'Take Rate',
            position: 'right' as const,
            alignTicks: true,
            nameGap: 14,
            axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%' },
            ...chartAxis,
          },
        ],
        series: [
          {
            name: '预分润收入',
            type: 'bar',
            data: assetMonthlyTrendData.map((d) => d.expectedProfitIncome),
            barWidth: 16,
            itemStyle: { color: chartPalette.green600, borderRadius: [5, 5, 0, 0] },
          },
          {
            name: 'Take Rate',
            type: 'line',
            yAxisIndex: 1,
            data: assetMonthlyTrendData.map((d) => d.takeRate),
            smooth: true,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 3 },
            itemStyle: { color: chartPalette.mint500 },
            areaStyle: areaStyleByColor(chartPalette.mint500),
          },
        ],
      };

      return {
        assetName,
        assetLoanBalanceTrendOption,
        assetProfitTakeRateTrendOption,
      };
    });
  }, [assetData, selectedAssets]);

  const budgetIncomeYtdByMonth = useMemo(() => {
    let running = 0;
    return monthlyData.map((row) => {
      running += row.budgetIncome;
      return running;
    });
  }, [monthlyData]);

  const actualIncomeYtdByMonth = useMemo(() => {
    let running = 0;
    return monthlyData.map((row) => {
      running += row.actualIncome;
      return running;
    });
  }, [monthlyData]);

  const loanBalanceOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      ...chartTooltip,
      formatter: (params: any) => {
        let s = params[0].axisValue + '<br/>';
        params.forEach((p: any) => {
          s += `${p.marker} ${p.seriesName}: ${(p.value / 1e4).toFixed(2)}万元<br/>`;
        });
        return s;
      },
    },
    legend: { data: ['放款金额', '预算余额', '实际余额'], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 60, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: monthlyData.map((d) => d.month),
      axisLabel: buildXAxisLabelDensity(monthlyData.length),
      ...chartAxis,
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '放款(万元)',
        position: 'left' as const,
        alignTicks: true,
        nameGap: 14,
        axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
        ...chartAxis,
      },
      {
        type: 'value' as const,
        name: '余额(万元)',
        position: 'right' as const,
        alignTicks: true,
        nameGap: 14,
        axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
        ...chartAxis,
      },
    ],
    series: [
      {
        name: '放款金额',
        type: 'line',
        data: monthlyData.map((d) => d.loanAmount),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3 },
        itemStyle: { color: chartPalette.green700 },
      },
      {
        name: '预算余额',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: 16,
        barGap: '30%',
        barCategoryGap: '42%',
        data: monthlyData.map((d) => d.budgetBalance),
        itemStyle: { color: chartPalette.neutral500, opacity: 0.45, borderRadius: [5, 5, 0, 0] },
      },
      {
        name: '实际余额',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: 16,
        data: monthlyData.map((d) => d.balance),
        itemStyle: { color: chartPalette.green400, borderRadius: [5, 5, 0, 0] },
      },
    ],
  };

  const incomeOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      ...chartTooltip,
      formatter: (params: any) => {
        let s = params[0].axisValue + '<br/>';
        params.forEach((p: any) => {
          s += `${p.marker} ${p.seriesName}: ${(p.value / 1e4).toFixed(0)}万元<br/>`;
        });
        return s;
      },
    },
    legend: { data: ['预算收入', '实际收入'], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 60, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: monthlyData.map((d) => d.month),
      axisLabel: buildXAxisLabelDensity(monthlyData.length),
      ...chartAxis,
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '收入(万元)',
        position: 'left' as const,
        alignTicks: true,
        nameGap: 14,
        axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
        ...chartAxis,
      },
    ],
    series: [
      {
        name: '预算收入',
        type: 'bar',
        data: monthlyData.map((d) => d.budgetIncome),
        barWidth: 16,
        barGap: '30%',
        barCategoryGap: '42%',
        itemStyle: { color: chartPalette.neutral500, opacity: 0.45, borderRadius: [5, 5, 0, 0] },
      },
      {
        name: '实际收入',
        type: 'bar',
        barWidth: 16,
        data: monthlyData.map((d) => d.actualIncome),
        itemStyle: { color: chartPalette.green600, borderRadius: [5, 5, 0, 0] },
      },
    ],
  };

  const incomeYtdOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const },
      ...chartTooltip,
      formatter: (params: any) => {
        let s = params[0].axisValue + '<br/>';
        params.forEach((p: any) => {
          s += `${p.marker} ${p.seriesName}: ${(p.value / 1e4).toFixed(0)}万元<br/>`;
        });
        return s;
      },
    },
    legend: { data: ['预算收入YTD', '实际收入YTD'], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: monthlyData.map((d) => d.month),
      axisLabel: buildXAxisLabelDensity(monthlyData.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: '累计收入(万元)',
      axisLabel: { formatter: (v: number) => (v / 1e4).toFixed(0) },
      ...chartAxis,
    },
    series: [
      {
        name: '预算收入YTD',
        type: 'line',
        data: budgetIncomeYtdByMonth,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, type: 'dashed' as const, color: chartPalette.neutral500, opacity: 0.9 },
        itemStyle: { color: chartPalette.neutral500 },
      },
      {
        name: '实际收入YTD',
        type: 'line',
        data: actualIncomeYtdByMonth,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 4, color: chartPalette.green700 },
        itemStyle: { color: chartPalette.green700, borderColor: '#ffffff', borderWidth: 2 },
        areaStyle: areaStyleByColor(chartPalette.green600),
      },
    ],
  };

  const takeRateTrendOption = {
    color: chartSeries,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const },
      ...chartTooltip,
      formatter: (params: any) => {
        let s = params[0].axisValue + '<br/>';
        params.forEach((p: any) => {
          s += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
        });
        return s;
      },
    },
    legend: { data: ['预期Take Rate', '实际Take Rate'], bottom: 0, ...chartLegend },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: monthlyData.map((d) => d.month),
      axisLabel: buildXAxisLabelDensity(monthlyData.length),
      ...chartAxis,
    },
    yAxis: {
      type: 'value' as const,
      name: 'Take Rate',
      axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%' },
      ...chartAxis,
    },
    series: [
      {
        name: '预期Take Rate',
        type: 'line',
        data: monthlyData.map((d) => d.expectedTakeRate),
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, type: 'dashed' as const, color: chartPalette.neutral500, opacity: 0.95 },
        itemStyle: { color: chartPalette.neutral500 },
      },
      {
        name: '实际Take Rate',
        type: 'line',
        data: monthlyData.map((d) => d.actualTakeRate),
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3 },
        itemStyle: { color: chartPalette.green700 },
        areaStyle: areaStyleByColor(chartPalette.green600),
      },
    ],
  };

  const financeMonthlyColumns: ColumnsType<FinancialMonthly> = [
    { title: '财务月', dataIndex: 'month', key: 'month', width: 90 },
    { title: '放款金额(万元)', dataIndex: 'loanAmount', key: 'loanAmount', width: 140, render: (v) => formatWan(v) },
    { title: '在贷余额(万元)', dataIndex: 'balance', key: 'balance', width: 140, render: (v) => formatWan(v) },
    { title: '预算余额(万元)', dataIndex: 'budgetBalance', key: 'budgetBalance', width: 140, render: (v) => formatWan(v) },
    { title: '余额达成率', dataIndex: 'budgetAchievement', key: 'budgetAchievement', width: 100, render: (v) => formatPercent(v) },
    { title: '预算收入(万元)', dataIndex: 'budgetIncome', key: 'budgetIncome', width: 140, render: (v) => formatWan(v) },
    { title: '实际收入(万元)', dataIndex: 'actualIncome', key: 'actualIncome', width: 140, render: (v) => formatWan(v) },
    {
      title: '收入达成率',
      key: 'incomeAchievement',
      width: 100,
      render: (_, row) => formatPercent(row.actualIncome / row.budgetIncome),
    },
    { title: '预期Take Rate', dataIndex: 'expectedTakeRate', key: 'expectedTakeRate', width: 120, render: (v) => formatPercent(v) },
    { title: '实际Take Rate', dataIndex: 'actualTakeRate', key: 'actualTakeRate', width: 120, render: (v) => formatPercent(v) },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="overview"
        tabBarExtraContent={
          <Space>
            <span style={{ fontWeight: 500 }}>财务年度：</span>
            <Select options={fyOptions} value={fy} onChange={setFy} style={{ width: 120 }} />
          </Space>
        }
        items={[
          {
            key: 'overview',
            label: '总体财务',
            children: (
              <>
                <div className="finance-top-scroll-wrap">
                  <div className="finance-top-scroll">
                    <div className="chart-card">
                      <div className="chart-title">月度放款与余额</div>
                      <ReactECharts option={loanBalanceOption} style={{ height: 320 }} />
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">收入达成</div>
                      <ReactECharts option={incomeOption} style={{ height: 320 }} />
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">预期与实际Take Rate</div>
                      <ReactECharts option={takeRateTrendOption} style={{ height: 320 }} />
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">收入YTD趋势</div>
                      <ReactECharts option={incomeYtdOption} style={{ height: 320 }} />
                    </div>
                  </div>
                </div>

                <div className="finance-bottom" style={{ marginBottom: 16 }}>
                  <div className="chart-card" style={{ marginBottom: 16 }}>
                    <div className="chart-title">月度放款与收入明细</div>
                    <Table<FinancialMonthly>
                      columns={financeMonthlyColumns}
                      dataSource={monthlyData}
                      rowKey="month"
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 1300 }}
                    />
                  </div>
                </div>
              </>
            ),
          },
          {
            key: 'asset',
            label: '资产明细分析',
            children: (
              <>
                <div className="finance-bottom">
                  <div className="risk-section">
                    <div className="section-title">
                      <Space>
                        资产维度分析
                        <span style={{ fontWeight: 500 }}>资产类型：</span>
                        <Select
                          mode="multiple"
                          options={assetOptions}
                          value={selectedAssets}
                          onChange={setSelectedAssets}
                          maxTagCount="responsive"
                          style={{ minWidth: 300 }}
                        />
                        <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>多选资产后可横向滑动查看趋势图</span>
                      </Space>
                    </div>
                  </div>

                  <div className="asset-trend-scroll-wrap" style={{ marginBottom: 16 }}>
                    <div className={`asset-trend-scroll ${selectedAssetTrendList.length > 1 ? 'is-multi' : ''}`}>
                      {selectedAssetTrendList.map((item) => (
                        <div
                          key={item.assetName}
                          className="asset-trend-panel"
                        >
                          <div className="asset-trend-panel-title">{item.assetName}趋势图</div>
                          <div className="asset-trend-panel-charts">
                            <div className="chart-card asset-subchart">
                              <div className="chart-title">
                                <span>{item.assetName}放款与在贷余额趋势图</span>
                              </div>
                              <ReactECharts option={item.assetLoanBalanceTrendOption} style={{ height: 280 }} />
                            </div>
                            <div className="chart-card asset-subchart">
                              <div className="chart-title">
                                <span>{item.assetName}预分润收入与Take Rate趋势图</span>
                              </div>
                              <ReactECharts option={item.assetProfitTakeRateTrendOption} style={{ height: 280 }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="finance-detail-table">
                    <div className="finance-detail-note">
                      注：放款金额 * Take Rate = 定价 * 折扣率（风险表现） = 分润收入
                    </div>
                    <Table
                      columns={assetPivotColumns}
                      dataSource={assetPivotData}
                      rowKey="key"
                      scroll={{ x: 1750 }}
                      sticky
                      pagination={false}
                      size="small"
                      bordered
                    />
                  </div>
                </div>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default FinanceModule;
