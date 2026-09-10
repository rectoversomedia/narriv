import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Component representing interactive UI element for QA unit verification
function QAStatusToggle() {
  const [active, setActive] = useState(false);

  return (
    <section aria-labelledby="qa-section-heading">
      <h2 id="qa-section-heading">QA Testing Harness</h2>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive(!active)}
      >
        {active ? 'Engine: ACTIVE' : 'Engine: IDLE'}
      </button>
      {active && <p role="status">Vitest & RTL Operational on macOS</p>}
    </section>
  );
}

describe('Vitest + React Testing Library Runner', () => {
  it('renders initial state correctly with proper ARIA semantics', () => {
    render(<QAStatusToggle />);

    const button = screen.getByRole('button', { name: /Engine: IDLE/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('toggles active state and renders confirmation banner on click', () => {
    render(<QAStatusToggle />);

    const button = screen.getByRole('button', { name: /Engine: IDLE/i });
    fireEvent.click(button);

    expect(button).toHaveTextContent('Engine: ACTIVE');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    const statusBanner = screen.getByRole('status');
    expect(statusBanner).toBeInTheDocument();
    expect(statusBanner).toHaveTextContent('Vitest & RTL Operational on macOS');
  });
});
