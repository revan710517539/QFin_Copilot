import React, { useMemo, useState } from 'react';
import { Table, Tabs, Cascader, Select } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { GlobalFilter, RiskDetailRow } from '../types';
import { formatPercent, formatWan } from '../utils/format';
import { buildXAxisLabelDensity, chartSeries, vintageRateColor } from '../utils/chartTheme';
import { getRiskDetailData, getRiskDrilldownData, getRiskDrilldownVintageData, getVintageData } from '../mock/data';

interface Props {
  globalFilter: GlobalFilter;
}

const RiskModule: React.FC<Props> = ({ globalFilter }) => {
  const [selectedLoanMonth, setSelectedLoanMonth] = useState<string>('1月');
  const [selectedVintageMobs, setSelectedVintageMobs] = useState<number[]>([3, 6, 9]);
  const [vintageCascaderValue, setVintageCascaderValue] = useState<[string, string] | undefined>(undefined);
  const [overdueCascaderValue, setOverdueCascaderValue] = useState<[string, string] | undefined>(undefined);
  const [vintageMonthType, setVintageMonthType] = useState<'natural' | 'loan'>('loan');

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

  const vintageCascaderOptions = [
    {
      value: 'creditRange',
      label: '额度',
      children: [
        { value: '0-20万', label: '0-20万' },
        { value: '20-40万', label: '20-40万' },
        { value: '40-80万', label: '40-80万' },
        { value: '80万+', label: '80万+' },
      ],
    },
    {
      value: 'pricingRange',
      label: '定价',
      children: [
        { value: '0-12%', label: '0-12%' },
        { value: '12-18%', label: '12-18%' },
        { value: '18-24%', label: '18-24%' },
        { value: '24%+', label: '24%+' },
      ],
    },
    {
      value: 'repayment',
      label: '还款方式',
      children: [
        { value: '等额本息', label: '等额本息' },
        { value: '先息后本', label: '先息后本' },
        { value: '随借随还', label: '随借随还' },
        { value: '一次性还本', label: '一次性还本' },
      ],
    },
  ];

  const vintageDimension = vintageCascaderValue?.[0] as 'creditRange' | 'pricingRange' | 'repayment' | undefined;
  const selectedBucket = vintageCascaderValue?.[1];

  const overdueDimension = overdueCascaderValue?.[0] as 'creditRange' | 'pricingRange' | 'repayment' | undefined;
  const selectedOverdueBucket = overdueCascaderValue?.[1];

  // 获取所有月份的vintage数据，按选中的维度和bucket筛选
  const allMonthsVintageData = useMemo(() => {
    // 如果没有选择维度，显示全部数据
    if (!vintageDimension || !selectedBucket) {
      return vintageTableData;
    }
    
    return cohorts.map((cohort) => {
      const monthData = getRiskDrilldownVintageData(cohort, vintageDimension, vintageMonthType);
      const bucketData = monthData.find((item) => item.bucket === selectedBucket);
      const drilldownData = getRiskDrilldownData(cohort, vintageDimension, vintageMonthType);
      const bucketDrilldownData = drilldownData.find((item) => item.bucket === selectedBucket);
      
      const row: Record<string, any> = { cohort };
      
      // 添加放款金额
      if (bucketDrilldownData) {
        row.loanAmount = bucketDrilldownData.loanAmount;
      }
      
      // 添加vintage数据
      if (bucketData) {
        for (let mob = 0; mob <= 12; mob++) {
          row[`mob${mob}`] = bucketData[`mob${mob}`];
        }
      }
      return row;
    });
  }, [cohorts, vintageDimension, selectedBucket, vintageTableData, vintageMonthType]);

  // 获取逾期数据，按选中的维度和bucket筛选
  const filteredOverdueData = useMemo(() => {
    // 如果没有选择维度，显示全部数据
    if (!overdueDimension || !selectedOverdueBucket) {
      return detailData;
    }
    
    return detailData.map((monthDetail) => {
      const drilldownData = getRiskDrilldownData(monthDetail.period, overdueDimension);
      const bucketData = drilldownData.find((item) => item.bucket === selectedOverdueBucket);
      
      if (bucketData) {
        return {
          period: monthDetail.period,
          loanAmount: bucketData.loanAmount,
          balance: bucketData.balance,
          loanCount: bucketData.loanCount,
          avgCredit: bucketData.avgCredit,
          avgPricing: bucketData.avgPricing,
          dpd3Principal: bucketData.dpd3Principal,
          dpd3Rate: bucketData.dpd3Rate,
          dpd3Count: bucketData.dpd3Count,
          dpd30Principal: bucketData.dpd30Principal,
          dpd30Rate: bucketData.dpd30Rate,
          dpd30Count: bucketData.dpd30Count,
          dpd90Principal: bucketData.dpd90Principal,
          dpd90Rate: bucketData.dpd90Rate,
          dpd90Count: bucketData.dpd90Count,
        };
      }
      return monthDetail;
    });
  }, [detailData, overdueDimension, selectedOverdueBucket]);

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
                      <Cascader
                        options={vintageCascaderOptions}
                        value={vintageCascaderValue}
                        onChange={(value) => setVintageCascaderValue(value as [string, string] | undefined)}
                        placeholder="全部数据"
                        style={{ minWidth: 200 }}
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
                      <Cascader
                        options={vintageCascaderOptions}
                        value={overdueCascaderValue}
                        onChange={(value) => setOverdueCascaderValue(value as [string, string] | undefined)}
                        placeholder="全部数据"
                        style={{ minWidth: 200 }}
                        expandTrigger="hover"
                        allowClear
                      />
                    </div>
                    <Table<RiskDetailRow>
                      columns={detailColumns}
                      dataSource={filteredOverdueData}
                      rowKey="period"
                      scroll={{ x: 1550 }}
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
