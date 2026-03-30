export type RiskDimension = 'creditRange' | 'pricingRange' | 'repayment' | 'assetPackage';

export const riskDimensionBuckets: Record<RiskDimension, string[]> = {
  creditRange: ['0-20万', '20-40万', '40-80万', '80万+'],
  pricingRange: ['0-12%', '12-18%', '18-24%', '24%+'],
  repayment: ['等额本息', '先息后本', '随借随还', '一次性还本'],
  assetPackage: ['资产包A', '资产包B', '资产包C', '资产包D'],
};

export const riskDimensionOptions = [
  {
    value: 'creditRange',
    label: '额度',
    children: riskDimensionBuckets.creditRange.map((bucket) => ({ value: bucket, label: bucket })),
  },
  {
    value: 'pricingRange',
    label: '定价',
    children: riskDimensionBuckets.pricingRange.map((bucket) => ({ value: bucket, label: bucket })),
  },
  {
    value: 'repayment',
    label: '还款方式',
    children: riskDimensionBuckets.repayment.map((bucket) => ({ value: bucket, label: bucket })),
  },
  {
    value: 'assetPackage',
    label: '资产包',
    children: riskDimensionBuckets.assetPackage.map((bucket) => ({ value: bucket, label: bucket })),
  },
];
