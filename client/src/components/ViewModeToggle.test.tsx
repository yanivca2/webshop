import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ViewModeToggle from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it('marks the active mode as pressed', () => {
    render(<ViewModeToggle value="list" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /cards/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the picked mode when a button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeToggle value="cards" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /list/i }));

    expect(onChange).toHaveBeenCalledWith('list');
  });
});
