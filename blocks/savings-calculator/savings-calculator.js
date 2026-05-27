/**
 * savings-calculator.js — EDS entry point
 * Reads configuration as a key-value block
 */
import { parseBlock } from '../../scripts/utils/block-parser.js';
import { loadReact } from '../../scripts/utils/react-loader.js';

const SCHEMA = {
  structure: 'key-value',
  fields: [
    { name: 'defaultUsageCCF', key: 'default-usage-ccf', type: 'number' },
    { name: 'currentRateCents', key: 'current-rate-cents', type: 'number' },
    { name: 'ourRateCents', key: 'our-rate-cents', type: 'number' },
    { name: 'ctaUrl', key: 'cta-url', type: 'link' },
  ],
};

export default async function decorate(block) {
  const parsedConfig = parseBlock(block, SCHEMA);

  block.innerHTML = '';
  const mountPoint = document.createElement('div');
  mountPoint.classList.add('savings-calculator-mount');
  block.append(mountPoint);

  const [{ React, ReactDOM }, { default: SavingsCalculator }] =
    await Promise.all([
      loadReact(),
      import('./components/SavingsCalculator.bundle.js'),
    ]);

  const root = ReactDOM.createRoot(mountPoint);
  root.render(React.createElement(SavingsCalculator, { config: parsedConfig }));
}
