import { describe, it, expect, vi } from 'vitest';
import { replayQueue } from './replayQueue';
import { requestFor, isPending, isServerId } from './taskRequests';

/*
 * The offline queue's rules, without a server.
 *
 * `send` is the only thing replayQueue talks to, so a stub of it is enough to
 * pin down the behaviour that matters: ordering, the local-id rewrite, and what
 * each failure does to the rest of the queue.
 */
const SERVER_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';

const draft = { id: 'local-1-abc', title: 'Written offline', status: 'todo' };
const create = { id: 'q1', type: 'CREATE_TASK', status: 'todo', task: draft };
const editDraft = { id: 'q2', type: 'UPDATE_TASK', taskId: draft.id, task: { ...draft, title: 'Edited' } };
const moveDraft = { id: 'q3', type: 'MOVE_TASK', taskId: draft.id, from: 'todo', to: 'doing' };

const saved = (data = {}) => ({ saved: true, data });
const createdAs = (id) => saved({ task: { _id: id } });

describe('requestFor', () => {
  it('turns a create into a POST to the board\'s tasks', () => {
    expect(requestFor('q3-roadmap', create)).toEqual({
      path: '/api/boards/q3-roadmap/tasks',
      method: 'POST',
      body: { title: 'Written offline', description: undefined, status: 'todo', priority: undefined },
    });
  });

  it('sends expectedVersion only when the caller supplied one', () => {
    const base = { type: 'UPDATE_TASK', taskId: SERVER_ID, task: { title: 'x' } };
    expect(requestFor('b', base).body).not.toHaveProperty('expectedVersion');
    expect(requestFor('b', { ...base, expectedVersion: 4 }).body.expectedVersion).toBe(4);
  });

  it('turns a move into the status PATCH the API expects', () => {
    expect(requestFor('b', { type: 'MOVE_TASK', taskId: SERVER_ID, to: 'done' })).toMatchObject({
      method: 'PATCH',
      body: { status: 'done' },
    });
  });

  it('refuses to address a task the server has never issued an id for', () => {
    expect(requestFor('b', editDraft)).toBeNull();
    expect(isPending(editDraft)).toBe(true);
    expect(isServerId(draft.id)).toBe(false);
    expect(isServerId(SERVER_ID)).toBe(true);
  });
});

describe('replayQueue', () => {
  it('replays in order and rewrites local ids to the ones the server issued', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(createdAs(SERVER_ID))
      .mockResolvedValue(saved());

    const { remaining, conflict, dropped } = await replayQueue([create, editDraft, moveDraft], send);

    expect(remaining).toEqual([]);
    expect(conflict).toBeNull();
    expect(dropped).toEqual([]);

    // The edit and the move must address the created task, not the draft.
    expect(send.mock.calls[1][0].taskId).toBe(SERVER_ID);
    expect(send.mock.calls[1][0].task._id).toBe(SERVER_ID);
    expect(send.mock.calls[2][0].taskId).toBe(SERVER_ID);
  });

  it('leaves ids alone for tasks the server already knows', async () => {
    const send = vi.fn().mockResolvedValue(saved());
    await replayQueue([{ id: 'q9', type: 'DELETE_TASK', taskId: OTHER_ID }], send);
    expect(send.mock.calls[0][0].taskId).toBe(OTHER_ID);
  });

  it('stops at a conflict and keeps everything from there on', async () => {
    const latest = { _id: SERVER_ID, title: 'Theirs', version: 3 };
    const send = vi.fn()
      .mockResolvedValueOnce({ conflict: true, latest })
      .mockResolvedValue(saved());

    const edit = { id: 'q4', type: 'UPDATE_TASK', taskId: SERVER_ID, task: { title: 'Mine' }, expectedVersion: 0 };
    const move = { id: 'q5', type: 'MOVE_TASK', taskId: SERVER_ID, to: 'done' };

    const { remaining, conflict } = await replayQueue([edit, move], send);

    expect(conflict).toMatchObject({ queuedId: 'q4', latest });
    expect(remaining.map((a) => a.id)).toEqual(['q4', 'q5']);
    // One dialog, not one per queued change: nothing behind it was attempted.
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('stops when the server becomes unreachable again, keeping the order', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(saved())
      .mockResolvedValueOnce({ unreachable: true, error: new Error('offline') })
      .mockResolvedValue(saved());

    const first = { id: 'qa', type: 'DELETE_TASK', taskId: SERVER_ID };
    const second = { id: 'qb', type: 'DELETE_TASK', taskId: OTHER_ID };
    const third = { id: 'qc', type: 'DELETE_TASK', taskId: OTHER_ID };

    const { remaining } = await replayQueue([first, second, third], send);

    expect(remaining.map((a) => a.id)).toEqual(['qb', 'qc']);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('drops a change the server refuses outright and carries on', async () => {
    // The task was deleted while this device was away. Replaying it again would
    // fail identically, so keeping it would mean a queue that never empties.
    const send = vi.fn()
      .mockResolvedValueOnce({ failed: true, error: new Error('Task not found.') })
      .mockResolvedValue(saved());

    const doomed = { id: 'qd', type: 'UPDATE_TASK', taskId: SERVER_ID, task: { title: 'Too late' } };
    const fine = { id: 'qe', type: 'DELETE_TASK', taskId: OTHER_ID };

    const { remaining, dropped } = await replayQueue([doomed, fine], send);

    expect(remaining).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].error.message).toBe('Task not found.');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does nothing with an empty queue', async () => {
    const send = vi.fn();
    const { remaining } = await replayQueue([], send);
    expect(remaining).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });
});
