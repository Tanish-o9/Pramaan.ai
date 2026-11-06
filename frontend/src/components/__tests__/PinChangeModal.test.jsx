import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinChangeModal from '../PinChangeModal';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    studentChangePin: vi.fn(),
  },
}));

describe('PinChangeModal Component', () => {
  const dummyStudent = { name: 'Rahul Sharma', roll_number: '22CS042' };

  it('renders student name and security notice', () => {
    render(<PinChangeModal student={dummyStudent} onSuccess={() => {}} />);
    expect(screen.getByText('Security Update Required')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('rejects new PIN shorter than 4 digits', async () => {
    render(<PinChangeModal student={dummyStudent} onSuccess={() => {}} />);
    const newPinInput = screen.getByPlaceholderText('Enter new PIN');
    const confirmInput = screen.getByPlaceholderText('Re-enter new PIN');

    fireEvent.change(newPinInput, { target: { value: '12' } });
    fireEvent.change(confirmInput, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /set new pin/i }));

    expect(await screen.findByText('New PIN must be at least 4 digits.')).toBeInTheDocument();
  });

  it('rejects setting PIN to default 1234', async () => {
    render(<PinChangeModal student={dummyStudent} onSuccess={() => {}} />);
    const newPinInput = screen.getByPlaceholderText('Enter new PIN');
    const confirmInput = screen.getByPlaceholderText('Re-enter new PIN');

    fireEvent.change(newPinInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /set new pin/i }));

    expect(await screen.findByText(/cannot be the default 1234/i)).toBeInTheDocument();
  });

  it('rejects mismatched new PIN and confirmation PIN', async () => {
    render(<PinChangeModal student={dummyStudent} onSuccess={() => {}} />);
    const newPinInput = screen.getByPlaceholderText('Enter new PIN');
    const confirmInput = screen.getByPlaceholderText('Re-enter new PIN');

    fireEvent.change(newPinInput, { target: { value: '5678' } });
    fireEvent.change(confirmInput, { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: /set new pin/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('calls api.studentChangePin and onSuccess on valid PIN', async () => {
    api.studentChangePin.mockResolvedValueOnce({ status: 'success' });
    const handleSuccess = vi.fn();

    render(<PinChangeModal student={dummyStudent} onSuccess={handleSuccess} />);
    const newPinInput = screen.getByPlaceholderText('Enter new PIN');
    const confirmInput = screen.getByPlaceholderText('Re-enter new PIN');

    fireEvent.change(newPinInput, { target: { value: '9876' } });
    fireEvent.change(confirmInput, { target: { value: '9876' } });
    fireEvent.click(screen.getByRole('button', { name: /set new pin/i }));

    await waitFor(() => {
      expect(api.studentChangePin).toHaveBeenCalledWith('1234', '9876');
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
