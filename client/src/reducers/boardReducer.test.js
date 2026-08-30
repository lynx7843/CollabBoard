import { describe, it, expect } from 'vitest';
import { boardReducer, initialState } from './boardReducer';

/*
 * The board's whole state machine. Worth testing directly rather than through
 * the UI: it is where the real-time events and the optimistic local updates
 * meet, and getting that wrong shows up as a duplicated or a stranded card.
 */
const run = (state, ...actions) => actions.reduce(boardReducer, state);
const task = (id, status, extra = {}) => ({ _id: id, title: `task ${id}`, status, ...extra });

const loaded = (columns) => run(initialState, { type: 'TASKS_LOADED', payload: columns });
const oneTodo = loaded({ todo: [task('a', 'todo')], doing: [], done: [] });

describe('boardReducer', () => {
  describe('TASKS_LOADED', () => {
    it('fills in columns the server did not send', () => {
      const state = loaded({ todo: [task('a', 'todo')] });
      expect(state.columns).toEqual({ todo: [task('a', 'todo')], doing: [], done: [] });
      expect(state.loading).toBe(false);
    });
  });

  describe('TASK_CREATED', () => {
    it("adds someone else's new task to its column", () => {
      const state = run(oneTodo, { type: 'TASK_CREATED', payload: task('b', 'doing') });
      expect(state.columns.doing.map((t) => t._id)).toEqual(['b']);
    });

    it('ignores a task it already holds', () => {
      // The server broadcasts to the whole room including the writer, so the
      // client that just added a card receives it back a second time.
      const once = run(oneTodo, { type: 'TASK_CREATED', payload: task('b', 'todo') });
      const twice = run(once, { type: 'TASK_CREATED', payload: task('b', 'todo') });

      expect(twice.columns.todo).toHaveLength(2);
      expect(twice).toBe(once);
    });

    it('dedupes drafts keyed by a local id too', () => {
      const draft = { id: 'local-1', status: 'todo' };
      const state = run(initialState, { type: 'TASK_CREATED', payload: draft }, { type: 'TASK_CREATED', payload: draft });
      expect(state.columns.todo).toHaveLength(1);
    });
  });

  describe('TASK_UPDATED', () => {
    it('replaces an edited task where it sits', () => {
      const state = run(oneTodo, { type: 'TASK_UPDATED', payload: task('a', 'todo', { title: 'edited' }) });
      expect(state.columns.todo[0].title).toBe('edited');
    });

    it('does not reorder the column an edit happened in', () => {
      const three = loaded({ todo: [task('a', 'todo'), task('b', 'todo'), task('c', 'todo')], doing: [], done: [] });
      const state = run(three, { type: 'TASK_UPDATED', payload: task('a', 'todo', { title: 'edited' }) });
      expect(state.columns.todo.map((t) => t._id)).toEqual(['a', 'b', 'c']);
    });

    it('relocates a card when the status disagrees with its column', () => {
      // A move made by someone else arrives as task:updated with a new status;
      // there is no separate "moved" event on the wire.
      const state = run(oneTodo, { type: 'TASK_UPDATED', payload: task('a', 'done') });
      expect(state.columns.todo).toEqual([]);
      expect(state.columns.done.map((t) => t._id)).toEqual(['a']);
    });

    it('is a no-op for the echo of a move this client already applied', () => {
      const moved = run(oneTodo, { type: 'TASK_MOVED', payload: { taskId: 'a', from: 'todo', to: 'done' } });
      const echoed = run(moved, { type: 'TASK_UPDATED', payload: task('a', 'done') });
      expect(echoed.columns.done.map((t) => t._id)).toEqual(['a']);
      expect(echoed.columns.todo).toEqual([]);
    });

    it('ignores a task this board does not hold', () => {
      const state = run(oneTodo, { type: 'TASK_UPDATED', payload: task('elsewhere', 'todo') });
      expect(state).toBe(oneTodo);
    });
  });

  describe('TASK_MOVED', () => {
    it('carries the card to the other column with its new status', () => {
      const state = run(oneTodo, { type: 'TASK_MOVED', payload: { taskId: 'a', from: 'todo', to: 'doing' } });
      expect(state.columns.todo).toEqual([]);
      expect(state.columns.doing[0]).toMatchObject({ _id: 'a', status: 'doing' });
    });

    it('does nothing when the columns are the same', () => {
      const state = run(oneTodo, { type: 'TASK_MOVED', payload: { taskId: 'a', from: 'todo', to: 'todo' } });
      expect(state).toBe(oneTodo);
    });
  });

  describe('TASK_DELETED', () => {
    it('removes the card, and its broadcast echo changes nothing', () => {
      const once = run(oneTodo, { type: 'TASK_DELETED', payload: 'a' });
      const twice = run(once, { type: 'TASK_DELETED', payload: 'a' });
      expect(twice.columns.todo).toEqual([]);
    });
  });

  describe('BOARD_CHANGED', () => {
    it('empties the board so the previous one\'s cards never show under a new name', () => {
      const state = run(oneTodo, { type: 'BOARD_CHANGED' });
      expect(state.columns).toEqual(initialState.columns);
      expect(state.loading).toBe(true);
    });
  });
});
