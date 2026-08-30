import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardTabs } from './BoardTabs';

/*
 * Who is offered which controls.
 *
 * The server is the thing that actually enforces this — it returns `canCreate`
 * and refuses a create from anyone else — so these tests are about the tab
 * strip not offering a button that would only come back as a 403.
 */
const boards = [
  { slug: 'q3-roadmap', name: 'Q3 Roadmap', description: 'Everything shipping this quarter' },
  { slug: 'personal', name: 'Personal' },
];

const renderTabs = (props = {}) =>
  render(
    <BoardTabs
      boards={boards}
      activeSlug="q3-roadmap"
      canCreate={false}
      maxBoards={5}
      isAdmin={false}
      onSelect={vi.fn()}
      onCreate={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  );

describe('BoardTabs', () => {
  it('renders a tab per board', () => {
    renderTabs();
    expect(screen.getByRole('button', { name: 'Q3 Roadmap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument();
  });

  describe('for a member who is not the admin', () => {
    it('hides "New Board"', () => {
      renderTabs({ isAdmin: false, canCreate: false });
      expect(screen.queryByRole('button', { name: /new board/i })).not.toBeInTheDocument();
    });

    it('hides the per-tab delete control', () => {
      renderTabs({ isAdmin: false });
      expect(screen.queryByRole('button', { name: /delete q3 roadmap/i })).not.toBeInTheDocument();
    });

    it('does not show the board cap notice, which is not their concern', () => {
      renderTabs({ isAdmin: false, canCreate: false });
      expect(screen.queryByText(/maximum boards count/i)).not.toBeInTheDocument();
    });
  });

  describe('for the admin', () => {
    it('offers "New Board" while the server still allows one', async () => {
      const onCreate = vi.fn();
      renderTabs({ isAdmin: true, canCreate: true, onCreate });

      await userEvent.click(screen.getByRole('button', { name: /new board/i }));
      expect(onCreate).toHaveBeenCalled();
    });

    it('replaces it with the cap notice once the limit is reached', () => {
      renderTabs({ isAdmin: true, canCreate: false, maxBoards: 5 });

      expect(screen.queryByRole('button', { name: /new board/i })).not.toBeInTheDocument();
      expect(screen.getByText(/maximum boards count \(5\)/i)).toBeInTheDocument();
    });

    it('offers a delete control per tab', async () => {
      const onDelete = vi.fn();
      renderTabs({ isAdmin: true, onDelete });

      await userEvent.click(screen.getByRole('button', { name: /delete q3 roadmap/i }));
      expect(onDelete).toHaveBeenCalledWith(boards[0]);
    });
  });

  it('reports which board was picked', async () => {
    const onSelect = vi.fn();
    renderTabs({ onSelect });

    await userEvent.click(screen.getByRole('button', { name: 'Personal' }));
    expect(onSelect).toHaveBeenCalledWith('personal');
  });
});
