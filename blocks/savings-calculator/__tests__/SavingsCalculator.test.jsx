import { render, screen, fireEvent } from '@testing-library/react';
import SavingsCalculator from '../components/SavingsCalculator.jsx';

const defaultConfig = {
  defaultUsageCCF: 50,
  currentRateCents: 65,
  ourRateCents: 52,
  ctaUrl: '/enroll',
};

describe('SavingsCalculator', () => {
  test('renders with default values', () => {
    render(<SavingsCalculator config={defaultConfig} />);
    expect(screen.getByText(/How Much Could You Save/i)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  test('calculation is correct using default values', () => {
    render(<SavingsCalculator config={defaultConfig} />);
    // 50 CCF * (65 - 52) / 100 = $6.50
    expect(screen.getByText(/\$6\.50/)).toBeInTheDocument();
  });

  test('calculation updates when slider changes', () => {
    render(<SavingsCalculator config={defaultConfig} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '100' } });
    // 100 CCF * (65 - 52) / 100 = $13.00
    expect(screen.getByText(/\$13\.00/)).toBeInTheDocument();
  });

  test('CTA points to the correct URL', () => {
    render(<SavingsCalculator config={defaultConfig} />);
    const cta = screen.getByRole('link', { name: /Start saving/i });
    expect(cta).toHaveAttribute('href', '/enroll');
  });
});
