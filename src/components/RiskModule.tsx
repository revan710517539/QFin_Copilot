import React, { useMemo, useState } from 'react';
import { Table, Tabs, Cascader, Select } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { GlobalFilter, RiskDetailRow } from '../types';
import { formatPercent, formatWan } from '../utils/format';
import { buildXAxisLabelDensity, chartSeries, vintageRateColor } from '../utils/chartTheme';
import { riskDimensionBuckets, riskDimensionOptions } from '../constants/risk';
import type { RiskDimension } from '../constants/risk';
import { getRiskDetailData, getRiskDrilldownData, getRiskDrilldownVintageData, getVintageData } from '../mock/data';

interface Props {
  globalFilter: GlobalFilter;
}

const RiskModule: React.FC<Props> = ({ globalFilter }) => {
  const [selectedLoanMonth, setSelectedLoanMonth] = useState<string>('1月');
  const [selectedVintageMobs, setSelectedVintageMobs] = useState<number[]>([3, 6, 9]);
  const [vintageAssetBucket, setVintageAssetBucket] = useState<string | undefined>(undefined);
  const [vintageMetricCascaderValue, setVintageMetricCascaderValue] = useState<[RiskDimension, string] | undefined>(undefined);
  const [overdueAssetBucket, setOverdueAssetBucket] = useState<string | undefined>(undefined);
  const [overdueMetricCascaderValue, setOverdueMetricCascaderValue] = useState<[RiskDimension, string] | undefined>(undefined);
  const [vintageMonthType, setVintageMonthType] = useState<'natural' | 'loan'>('loan');

  const metricDimensionOptions = useMemo(
    () => riskDimensionOptions.filter((option) => option.value !== 'assetPackage'),
    []
  );

  const vintageData = useMemo(() => getVintageData(globalFilter, vintageMonthType), [globalFilter, vintageMonthType]);
  const detailData = useMemo(() => getRiskDetailData(globalFilter, vintageMonthType), [globalFilter, vintageMonthType]);

  const cohorts = [...new Set(vintageData.map((item) => item.cohort))];
  const mobOptions = useMemo(
    () =>
      Array.from(new Set(vintageData.map((item) => item.mob)))
        .sort((a, b) => a - b)
        .filter((mob) => mob > 0)
        .map((mob) => ({ label: `MOB${mob}`, value: mob })),
    [vintageData]
  );
  const activeVintageMobs = useMemo(() => {
    const availableMobs = new Set(mobOptions.map((option) => Number(option.value)));
    return selectedVintageMobs
      .map((mob) => Number(mob))
      .filter((mob) => availableMobs.has(mob));
  }, [mobOptions, selectedVintageMobs]);

  const vintageTableData = cohorts.map((cohort) => {
    const row: Record<string, any> = { cohort };
    
    // 从detailData中获取放款金额
    const detailRow = detailData.find((d) => d.period === cohort);
    if (detailRow) {
      row.loanAmount = detailRow.loanAmount;
    }
    
    vintageData
      .filter((item) => item.cohort === cohort)
      .forEach((item) => {
        row[`mob${item.mob}`] = item.rate;
      });
    return row;
  });

  const mobColumns = [
    { title: '月份', dataIndex: 'cohort', key: 'cohort', fixed: 'left' as const, width: 100 },
    { title: '放款金额（万元）', dataIndex: 'loanAmount', key: 'loanAmount', width: 120, render: (v: number) => v ? formatWan(v) : '-' },
    ...Array.from({ length: 12 }, (_, index) => {
      const mob = index + 1;
      return {
      title: `MOB${mob}`,
      dataIndex: `mob${mob}`,
      key: `mob${mob}`,
      width: 80,
      render: (value: number) => (value ? <span style={{ color: vintageRateColor(value), fontWeight: 600 }}>{(value * 100).toFixed(2)}%</span> : '-'),
    };}),
  ];

  const detailColumns: ColumnsType<RiskDetailRow> = [
    { title: '放款月', dataIndex: 'period', key: 'period', fixed: 'left', width: 72, sorter: (a, b) => a.period.localeCompare(b.period) },
    { title: '放款金额（万元）', dataIndex: 'loanAmount', key: 'loanAmount', width: 110, render: (v) => formatWan(v), sorter: (a, b) => a.loanAmount - b.loanAmount },
    { title: '在贷余额（万元）', dataIndex: 'balance', key: 'balance', width: 110, render: (v) => formatWan(v), sorter: (a, b) => a.balance - b.balance },
    { title: '在贷人数', dataIndex: 'loanCount', key: 'loanCount', width: 76, render: (v) => v.toLocaleString(), sorter: (a, b) => a.loanCount - b.loanCount },
    { title: '平均额度（万元）', dataIndex: 'avgCredit', key: 'avgCredit', width: 110, render: (v) => formatWan(v), sorter: (a, b) => a.avgCredit - b.avgCredit },
    { title: '名义久期（月）', dataIndex: 'nominalDuration', key: 'nominalDuration', width: 96, render: (v) => v.toFixed(1), sorter: (a, b) => a.nominalDuration - b.nominalDuration },
    { title: '平均定价', dataIndex: 'avgPricing', key: 'avgPricing', width: 76, render: (v) => formatPercent(v), sorter: (a, b) => a.avgPricing - b.avgPricing },
    {
      title: '3D+ 逾期',
      children: [
        { title: '逾期本金（万元）', dataIndex: 'dpd3Principal', key: 'dpd3Principal', width: 110, render: (v) => formatWan(v) },
        { title: '逾期率', dataIndex: 'dpd3Rate', key: 'dpd3Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd3Count', key: 'dpd3Count', width: 72 },
      ],
    },
    {
      title: '30D+ 逾期',
      children: [
        { title: '逾期本金（万元）', dataIndex: 'dpd30Principal', key: 'dpd30Principal', width: 110, render: (v) => formatWan(v) },
        { title: '逾期率', dataIndex: 'dpd30Rate', key: 'dpd30Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd30Count', key: 'dpd30Count', width: 72 },
      ],
    },
    {
      title: '不良',
      children: [
        { title: '90D+逾期本金（万元）', dataIndex: 'dpd90Principal', key: 'dpd90Principal', width: 130, render: (v) => formatWan(v) },
        { title: '逾期率', dataIndex: 'dpd90Rate', key: 'dpd90Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd90Count', key: 'dpd90Count', width: 72 },
      ],
    },
  ];

  const vintageDimension = vintageMetricCascaderValue?.[0];
  const selectedVintageMetricBucket = vintageMetricCascaderValue?.[1];

  const overdueDimension = overdueMetricCascaderValue?.[0];
  const selectedOverdueMetricBucket = overdueMetricCascaderValue?.[1];

  const mergeDrilldownRows = (rows: ReturnType<typeof getRiskDrilldownData>): Omit<RiskDetailRow, 'period'> | null => {
    if (rows.length === 0) return null;
    const size = rows.length;
    const sum = rows.reduce(
      (acc, row) => ({
        loanAmount: acc.loanAmount + row.loanAmount,
        balance: acc.balance + row.balance,
        loanCount: acc.loanCount + row.loanCount,
        avgCredit: acc.avgCredit + row.avgCredit,
        nominalDuration: acc.nominalDuration + row.nominalDuration,
        avgPricing: acc.avgPricing + row.avgPricing,
        dpd3Principal: acc.dpd3Principal + row.dpd3Principal,
        dpd3Rate: acc.dpd3Rate + row.dpd3Rate,
        dpd3Count: acc.dpd3Count + row.dpd3Count,
        dpd30Principal: acc.dpd30Principal + row.dpd30Principal,
        dpd30Rate: acc.dpd30Rate + row.dpd30Rate,
        dpd30Count: acc.dpd30Count + row.dpd30Count,
        dpd90Principal: acc.dpd90Principal + row.dpd90Principal,
        dpd90Rate: acc.dpd90Rate + row.dpd90Rate,
        dpd90Count: acc.dpd90Count + row.dpd90Count,
      }),
      {
        loanAmount: 0,
        balance: 0,
        loanCount: 0,
        avgCredit: 0,
        nominalDuration: 0,
        avgPricing: 0,
        dpd3Principal: 0,
        dpd3Rate: 0,
        dpd3Count: 0,
        dpd30Principal: 0,
        dpd30Rate: 0,
        dpd30Count: 0,
        dpd90Principal: 0,
        dpd90Rate: 0,
        dpd90Count: 0,
      }
    );

    return {
      loanAmount: sum.loanAmount / size,
      balance: sum.balance / size,
      loanCount: Math.round(sum.loanCount / size),
      avgCredit: sum.avgCredit / size,
      nominalDuration: sum.nominalDuration / size,
      avgPricing: sum.avgPricing / size,
      dpd3Principal: sum.dpd3Principal / size,
      dpd3Rate: sum.dpd3Rate / size,
      dpd3Count: Math.round(sum.dpd3Count / size),
      dpd30Principal: sum.dpd30Principal / size,
      dpd30Rate: sum.dpd30Rate / size,
      dpd30Count: Math.round(sum.dpd30Count / size),
      dpd90Principal: sum.dpd90Principal / size,
      dpd90Rate: sum.dpd90Rate / size,
      dpd90Count: Math.round(sum.dpd90Count / size),
    };
  };

  // 获取所有月份的vintage数据，按选中的维度和bucket筛选
  const allMonthsVintageData = useMemo(() => {
    const hasAssetFilter = Boolean(vintageAssetBucket);
    const hasMetricFilter = Boolean(vintageDimension && selectedVintageMetricBucket);
    if (!hasAssetFilter && !hasMetricFilter) {
      return vintageTableData;
    }
    
    return cohorts.map((cohort) => {
      const selectedVintageRows: ReturnType<typeof getRiskDrilldownVintageData> = [];
      const selectedDrilldownRows: ReturnType<typeof getRiskDrilldownData> = [];

      if (vintageAssetBucket) {
        const assetVintageRow = getRiskDrilldownVintageData(cohort, 'assetPackage', vintageMonthType).find(
          (item) => item.bucket === vintageAssetBucket
        );
        const assetDrilldownRow = getRiskDrilldownData(cohort, 'assetPackage', vintageMonthType).find(
          (item) => item.bucket === vintageAssetBucket
        );
        if (assetVintageRow) selectedVintageRows.push(assetVintageRow);
        if (assetDrilldownRow) selectedDrilldownRows.push(assetDrilldownRow);
      }

      if (vintageDimension && selectedVintageMetricBucket) {
        const metricVintageRow = getRiskDrilldownVintageData(cohort, vintageDimension, vintageMonthType).find(
          (item) => item.bucket === selectedVintageMetricBucket
        );
        const metricDrilldownRow = getRiskDrilldownData(cohort, vintageDimension, vintageMonthType).find(
          (item) => item.bucket === selectedVintageMetricBucket
        );
        if (metricVintageRow) selectedVintageRows.push(metricVintageRow);
        if (metricDrilldownRow) selectedDrilldownRows.push(metricDrilldownRow);
      }
      
      const row: Record<string, any> = { cohort };
      
      if (selectedDrilldownRows.length > 0) {
        row.loanAmount =
          selectedDrilldownRows.reduce((sum, item) => sum + item.loanAmount, 0) / selectedDrilldownRows.length;
      }
      
      if (selectedVintageRows.length > 0) {
        for (let mob = 0; mob <= 12; mob++) {
          const value =
            selectedVintageRows.reduce((sum, item) => sum + Number(item[`mob${mob}`] ?? 0), 0) /
            selectedVintageRows.length;
          row[`mob${mob}`] = value;
        }
      }
      return row;
    });
  }, [
    cohorts,
    vintageAssetBucket,
    vintageDimension,
    selectedVintageMetricBucket,
    vintageTableData,
    vintageMonthType,
  ]);

  // 获取逾期数据，按选中的维度和bucket筛选
  const filteredOverdueData = useMemo(() => {
    const hasAssetFilter = Boolean(overdueAssetBucket);
    const hasMetricFilter = Boolean(overdueDimension && selectedOverdueMetricBucket);
    if (!hasAssetFilter && !hasMetricFilter) {
      return detailData;
    }
    
    return detailData.map((monthDetail) => {
      const selectedRows: ReturnType<typeof getRiskDrilldownData> = [];
      if (overdueAssetBucket) {
        const assetRow = getRiskDrilldownData(monthDetail.period, 'assetPackage', vintageMonthType).find(
          (item) => item.bucket === overdueAssetBucket
        );
        if (assetRow) selectedRows.push(assetRow);
      }

      if (overdueDimension && selectedOverdueMetricBucket) {
        const metricRow = getRiskDrilldownData(monthDetail.period, overdueDimension, vintageMonthType).find(
          (item) => item.bucket === selectedOverdueMetricBucket
        );
        if (metricRow) selectedRows.push(metricRow);
      }

      const merged = mergeDrilldownRows(selectedRows);
      if (merged) {
        return {
          period: monthDetail.period,
          ...merged,
        };
      }
      return monthDetail;
    });
  }, [
    detailData,
    overdueAssetBucket,
    overdueDimension,
    selectedOverdueMetricBucket,
    vintageMonthType,
  ]);

  const overallRiskRateOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let content = `${params[0]?.axisValue || ''}<br/>`;
        params.forEach((p: any) => {
          content += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
        });
        return content;
      },
    },
    legend: { data: ['3D+逾期率', '30D+逾期率', '90D+逾期率'], bottom: 0 },
    grid: { left: 50, right: 20, top: 30, bottom: 45 },
    xAxis: {
      type: 'category' as const,
      data: detailData.map((item) => item.period),
      axisLabel: buildXAxisLabelDensity(detailData.length),
    },
    yAxis: {
      type: 'value' as const,
      name: '逾期率',
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    },
    series: [
      { name: '3D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd3Rate), itemStyle: { color: '#22c55e' } },
      { name: '30D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd30Rate), itemStyle: { color: '#f59e0b' } },
      { name: '90D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd90Rate), itemStyle: { color: '#ef4444' } },
    ],
  };

  const overallVintageOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let content = `${params[0]?.axisValue || ''}<br/>`;
        params.forEach((p: any) => {
          content += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
        });
        return content;
      },
    },
    color: chartSeries,
    legend: { data: activeVintageMobs.map((mob) => `MOB${mob}`), bottom: 0 },
    grid: { left: 50, right: 20, top: 30, bottom: 45 },
    xAxis: {
      type: 'category' as const,
      data: cohorts,
      axisLabel: buildXAxisLabelDensity(cohorts.length),
    },
    yAxis: {
      type: 'value' as const,
      name: 'Vintage逾期率',
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    },
    series: activeVintageMobs.map((mob, index) => ({
      name: `MOB${mob}`,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: vintageTableData.map((item) => (item[`mob${mob}`] as number) ?? 0),
      itemStyle: { color: chartSeries[index % chartSeries.length] },
    })),
  };

  return (
    <div>
      <Tabs
        defaultActiveKey="vintage"
        items={[
          {
            key: 'vintage',
            label: 'Vintage',
            children: (
              <>
                <div className="risk-section">
                  <div className="section-title">Vintage总体概览</div>
                  <div className="chart-card">
                    <div className="chart-title chart-title-inline-logic" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="chart-title-main">总体Vintage趋势</span>
                      <span style={{ fontWeight: 500 }}>月份类型：</span>
                      <Select
                        value={vintageMonthType}
                        onChange={(value) => setVintageMonthType(value)}
                        options={[
                          { label: '自然月', value: 'natural' },
                          { label: '放款月', value: 'loan' },
                        ]}
                        style={{ width: 100 }}
                      />
                      <span style={{ fontWeight: 500 }}>MOB：</span>
                      <Select
                        mode="multiple"
                        options={mobOptions}
                        value={activeVintageMobs}
                        onChange={(value) => setSelectedVintageMobs(value.map((mob) => Number(mob)))}
                        maxTagCount="responsive"
                        style={{ minWidth: 180 }}
                      />
                    </div>
                    <ReactECharts option={overallVintageOption} notMerge style={{ height: 280 }} />
                  </div>
                </div>

                <div className="risk-main risk-main-compact">
                  <div className="chart-card risk-table-card">
                    <div className="chart-title chart-title-inline-logic" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="chart-title-main">总体Vintage</span>
                      <span style={{ fontWeight: 500 }}>月份类型：</span>
                      <Select
                        value={vintageMonthType}
                        onChange={(value) => setVintageMonthType(value)}
                        options={[
                          { label: '自然月', value: 'natural' },
                          { label: '放款月', value: 'loan' },
                        ]}
                        style={{ width: 100 }}
                      />
                      <span style={{ fontWeight: 500 }}>维度筛选：</span>
                      <Select
                        value={vintageAssetBucket}
                        onChange={(value) => setVintageAssetBucket(value)}
                        options={riskDimensionBuckets.assetPackage.map((bucket) => ({ label: bucket, value: bucket }))}
                        placeholder="资产包"
                        style={{ minWidth: 140 }}
                        allowClear
                      />
                      <Cascader
                        options={metricDimensionOptions}
                        value={vintageMetricCascaderValue}
                        onChange={(value) => setVintageMetricCascaderValue(value as [RiskDimension, string] | undefined)}
                        placeholder="额度/利率/还款方式"
                        style={{ minWidth: 220 }}
                        expandTrigger="hover"
                        allowClear
                      />
                    </div>
                    <Table
                      columns={mobColumns}
                      dataSource={allMonthsVintageData}
                      pagination={false}
                      size="small"
                      scroll={{ x: 1220 }}
                      rowKey="cohort"
                      onRow={(record) => ({ onClick: () => setSelectedLoanMonth(record.cohort) })}
                      rowClassName={(record) => (record.cohort === selectedLoanMonth ? 'risk-row-selected' : '')}
                    />
                  </div>
                </div>
              </>
            ),
          },
          {
            key: 'overdue',
            label: '逾期',
            children: (
              <>
                <div className="risk-section">
                  <div className="section-title">逾期总体概览</div>
                  <div className="chart-card">
                    <div className="chart-title">总体逾期率趋势</div>
                    <ReactECharts option={overallRiskRateOption} style={{ height: 280 }} />
                  </div>
                </div>

                <div className="risk-main risk-main-compact">
                  <div className="chart-card risk-table-card">
                    <div className="chart-title chart-title-inline-logic" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="chart-title-main">总体逾期</span>
                      <span style={{ fontWeight: 500 }}>维度筛选：</span>
                      <Select
                        value={overdueAssetBucket}
                        onChange={(value) => setOverdueAssetBucket(value)}
                        options={riskDimensionBuckets.assetPackage.map((bucket) => ({ label: bucket, value: bucket }))}
                        placeholder="资产包"
                        style={{ minWidth: 140 }}
                        allowClear
                      />
                      <Cascader
                        options={metricDimensionOptions}
                        value={overdueMetricCascaderValue}
                        onChange={(value) => setOverdueMetricCascaderValue(value as [RiskDimension, string] | undefined)}
                        placeholder="额度/利率/还款方式"
                        style={{ minWidth: 220 }}
                        expandTrigger="hover"
                        allowClear
                      />
                    </div>
                    <Table<RiskDetailRow>
                      columns={detailColumns}
                      dataSource={filteredOverdueData}
                      rowKey="period"
                      scroll={{ x: 1680 }}
                      pagination={false}
                      size="small"
                      bordered
                      onRow={(record) => ({ onClick: () => setSelectedLoanMonth(record.period) })}
                      rowClassName={(record) => (record.period === selectedLoanMonth ? 'risk-row-selected' : '')}
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

export default RiskModule;
