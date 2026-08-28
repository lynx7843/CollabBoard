import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { colors } from '../theme';

/*
 * Browser-style tabs, one per board.
 *
 * The active tab is decided by the route, so a reload lands back on the same
 * board. "+ New Board" is rendered only when the server says the caller may
 * create one — non-admins never see it, and the admin sees the cap message
 * instead once they hold the maximum.
 */
export const BoardTabs = ({
  boards,
  activeSlug,
  canCreate,
  maxBoards,
  isAdmin,
  onSelect,
  onCreate,
  onDelete,
}) => {
  const atCap = isAdmin && !canCreate && boards.length > 0;

  return (
    <div style={styles.bar}>
      <div style={styles.tabs}>
        {boards.map((board, index) => {
          const active = board.slug === activeSlug;
          return (
            <div
              key={board.slug}
              className={`cb-tab${active ? ' cb-tab-active' : ''}`}
              style={{
                ...styles.tab,
                ...(index === 0 ? styles.tabFirst : null),
                ...(active ? styles.tabActive : null),
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(board.slug)}
                title={board.description || board.name}
                style={{ ...styles.tabLabel, color: active ? colors.black : colors.gray600 }}
              >
                {board.name}
              </button>

              {/* Closing a tab deletes the board, so only the admin gets one. */}
              {isAdmin && (
                <button
                  type="button"
                  aria-label={`Delete ${board.name}`}
                  title={`Delete ${board.name}`}
                  onClick={() => onDelete(board)}
                  className="cb-tab-close"
                  style={styles.close}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}

        {canCreate && (
          <button type="button" onClick={onCreate} className="cb-tab-new" style={styles.newTab}>
            <Plus size={16} />
            New Board
          </button>
        )}
      </div>

      {atCap && (
        <p style={styles.capNotice}>
          You have reached the maximum boards count ({maxBoards}). Delete a board to create another.
        </p>
      )}
    </div>
  );
};

/*
 * Name + description, the two things a new board needs. Rendered inline above
 * the tabs rather than as a modal, so it cannot trap focus behind the board.
 */
export const NewBoardForm = ({ onSubmit, onCancel, busy, error }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), description: description.trim() });
      }}
      style={styles.form}
    >
      <h3 style={styles.formTitle}>New board</h3>

      {error && <p style={styles.formError}>{error}</p>}

      <input
        className="cb-input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Board name — e.g. Q3 Roadmap"
        maxLength={80}
        required
        style={styles.input}
      />
      <input
        className="cb-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description — e.g. Manage all upcoming features and fixes"
        maxLength={280}
        style={styles.input}
      />

      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className="cb-new-task" style={styles.primaryButton}>
          {busy ? 'Creating...' : 'Create board'}
        </button>
      </div>
    </form>
  );
};

const styles = {
  bar: { marginBottom: '24px' },
  tabs: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  /*
   * Square, and butted straight against its neighbour — the yellow rule on the
   * right edge is what separates one tab from the next, so no gap is needed.
   */
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 8px 8px 14px',
    borderRadius: 0,
    borderTop: `1px solid ${colors.gray200}`,
    borderRight: `2px solid ${colors.yellow400}`,
    borderBottom: 'none',
    borderLeft: 'none',
    backgroundColor: colors.gray50,
    marginBottom: '-1px',
    maxWidth: '240px',
  },
  // The strip's outer left edge, so the run of tabs is bounded like its right.
  tabFirst: { borderLeft: `2px solid ${colors.yellow400}` },
  // No top rule: the active tab is told apart by the same light yellow fill the
  // sidebar gives its current item (Sidebar.jsx:91), so "where am I" reads the
  // same way in both places.
  tabActive: { backgroundColor: colors.yellow100 },
  tabLabel: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  close: {
    display: 'flex',
    padding: '2px',
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    color: colors.gray400,
    cursor: 'pointer',
    transition: 'background-color 150ms, color 150ms',
  },
  newTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: '8px',
    marginBottom: '4px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: `1px dashed ${colors.gray300}`,
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.gray600,
    cursor: 'pointer',
    transition: 'border-color 150ms, background-color 150ms, color 150ms',
  },
  capNotice: {
    margin: '10px 0 0',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: colors.yellow50,
    border: `1px solid ${colors.yellow200}`,
    fontSize: '13px',
    color: colors.yellow900,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    padding: '20px',
    borderRadius: '12px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
  },
  formTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold', color: colors.black },
  formError: {
    margin: 0,
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    fontSize: '13px',
  },
  input: {
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${colors.gray300}`,
    padding: '10px 14px',
    fontSize: '14px',
    color: colors.black,
    outline: 'none',
  },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  secondaryButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.gray300}`,
    backgroundColor: colors.white,
    fontSize: '14px',
    fontWeight: '600',
    color: colors.gray600,
    cursor: 'pointer',
  },
  primaryButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.yellow400,
    fontSize: '14px',
    fontWeight: '600',
    color: colors.black,
    cursor: 'pointer',
  },
};
