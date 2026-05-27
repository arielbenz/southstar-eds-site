import { useState } from 'react';

/**
 * SavingsCalculator — calcula el ahorro mensual vs la tasa actual.
 * @param {{ config: { defaultUsageCCF, currentRateCents, ourRateCents, ctaUrl } }} props
 */
export default function SavingsCalculator({ config }) {
  const {
    defaultUsageCCF = 50,
    currentRateCents = 65,
    ourRateCents = 52,
    ctaUrl = '/enroll',
  } = config ?? {};

  const [usage, setUsage] = useState(defaultUsageCCF);

  const currentMonthly = (usage * currentRateCents) / 100;
  const ourMonthly = (usage * ourRateCents) / 100;
  const savings = currentMonthly - ourMonthly;
  const savingsPct = currentMonthly > 0 ? (savings / currentMonthly) * 100 : 0;

  return (
    <div className="savings-calculator">
      <h3 className="savings-calculator__title">How Much Could You Save?</h3>

      <div className="savings-calculator__slider-group">
        <label className="savings-calculator__label" htmlFor="usage-slider">
          Monthly Usage: <strong>{usage} CCF</strong>
        </label>
        <input
          id="usage-slider"
          type="range"
          className="savings-calculator__slider"
          min={10}
          max={200}
          step={1}
          value={usage}
          onChange={(e) => setUsage(Number(e.target.value))}
          aria-valuemin={10}
          aria-valuemax={200}
          aria-valuenow={usage}
          aria-label={`Monthly usage: ${usage} CCF`}
        />
        <div className="savings-calculator__range-labels" aria-hidden="true">
          <span>10 CCF</span>
          <span>200 CCF</span>
        </div>
      </div>

      <div className="savings-calculator__comparison" aria-live="polite">
        <div className="savings-calculator__bar-group">
          <div className="savings-calculator__bar-label">
            Current rate ({currentRateCents}
            ¢/CCF)
          </div>
          <div
            className="savings-calculator__bar savings-calculator__bar--current"
            role="img"
            aria-label={`Current cost: $${currentMonthly.toFixed(2)}/month`}
          >
            <div
              className="savings-calculator__bar-fill"
              style={{ width: '100%' }}
            />
            <span className="savings-calculator__bar-value">
              ${currentMonthly.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="savings-calculator__bar-group">
          <div className="savings-calculator__bar-label">
            Our rate ({ourRateCents}
            ¢/CCF)
          </div>
          <div
            className="savings-calculator__bar savings-calculator__bar--ours"
            role="img"
            aria-label={`Our cost: $${ourMonthly.toFixed(2)}/month`}
          >
            <div
              className="savings-calculator__bar-fill"
              style={{ width: `${(ourRateCents / currentRateCents) * 100}%` }}
            />
            <span className="savings-calculator__bar-value">
              ${ourMonthly.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="savings-calculator__result" aria-live="assertive">
        <p className="savings-calculator__savings-text">
          You could save <strong>${savings.toFixed(2)}</strong> per month (
          {savingsPct.toFixed(0)}
          %)
        </p>
      </div>

      <a
        href={ctaUrl}
        className="button button--primary savings-calculator__cta"
        aria-label="Start saving on natural gas — enroll now"
      >
        Start Saving Today
      </a>
    </div>
  );
}
