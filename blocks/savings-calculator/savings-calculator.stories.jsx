import SavingsCalculator from './components/SavingsCalculator.jsx';

const defaultConfig = {
  defaultUsageCCF: 50,
  currentRateCents: 65,
  ourRateCents: 52,
  ctaUrl: '/enroll',
};

export default {
  title: 'Blocks/SavingsCalculator',
  component: SavingsCalculator,
};

export const Default = {
  args: { config: defaultConfig },
};

export const HighUsage = {
  args: {
    config: {
      ...defaultConfig,
      defaultUsageCCF: 150,
    },
  },
};
