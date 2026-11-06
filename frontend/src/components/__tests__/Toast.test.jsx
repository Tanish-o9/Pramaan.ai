import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ToastContainer, { toast } from '../Toast';

describe('ToastContainer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially when no toast is triggered', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('displays a success toast message when triggered', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Attendance saved successfully!', 'success');
    });
    expect(screen.getByText('Attendance saved successfully!')).toBeInTheDocument();
  });

  it('displays an error toast message', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Failed to capture frame', 'error');
    });
    expect(screen.getByText('Failed to capture frame')).toBeInTheDocument();
  });

  it('automatically dismisses toast after 4 seconds', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Temporary notification', 'info');
    });
    expect(screen.getByText('Temporary notification')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.queryByText('Temporary notification')).not.toBeInTheDocument();
  });
});

