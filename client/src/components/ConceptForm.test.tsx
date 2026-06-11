import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConceptForm } from './ConceptForm';

const noop = () => {};

describe('ConceptForm', () => {
  it('disables submit until a concept is entered', () => {
    render(
      <ConceptForm roles={[]} homebrew={[]} busy={false} onSubmit={noop} onOpenHomebrew={noop} />,
    );
    const button = screen.getByRole('button', { name: /Згенерувати/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Хорор про відьом/), {
      target: { value: 'witches, lots of misinformation' },
    });
    expect(button.disabled).toBe(false);
  });

  it('submits a well-formed request', () => {
    const onSubmit = vi.fn();
    render(
      <ConceptForm roles={[]} homebrew={[]} busy={false} onSubmit={onSubmit} onOpenHomebrew={noop} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Хорор про відьом/), {
      target: { value: 'spooky' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Згенерувати/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const req = onSubmit.mock.calls[0][0];
    expect(req.concept).toBe('spooky');
    expect(req.editions).toEqual(['tb', 'bmr', 'snv']);
    expect(req.includeHomebrew).toBe(false);
  });

  it('opens the homebrew manager', () => {
    const onOpenHomebrew = vi.fn();
    render(
      <ConceptForm roles={[]} homebrew={[]} busy={false} onSubmit={noop} onOpenHomebrew={onOpenHomebrew} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Керувати хоумбрю/ }));
    expect(onOpenHomebrew).toHaveBeenCalled();
  });
});
