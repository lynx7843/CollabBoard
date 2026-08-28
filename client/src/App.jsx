import { useContext, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BoardLayout } from './components/BoardLayout';
import { BoardView } from './components/BoardView';
import { BoardTabs, NewBoardForm } from './components/BoardTabs';
import { MemberManager } from './components/MemberManager';
import TaskConflictDialog from './components/TaskConflictDialog';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthContext } from './context/AuthContext';
import { useBoards } from './hooks/useBoards';
import { useBoardPersistence } from './utils/hooks/useBoardPersistence';
import { NetworkStatusBar } from './utils/hooks/components/NetworkStatusBar';

/*
 * The board in the URL is the open tab, so a reload reopens the same board and
 * a tab can be linked to directly. /boards with no slug lands on the first one.
 */
function BoardPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { boards, canCreate, maxBoards, loading, error, createBoard, deleteBoard } = useBoards();

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const activeSlug = slug || boards[0]?.slug;
  const board = boards.find((b) => b.slug === activeSlug);

  const { conflict, resolveConflict, submitAction, isOnline, isSyncing, message } =
    useBoardPersistence(activeSlug || 'none', null);

  const handleCreate = async ({ name, description }) => {
    setBusy(true);
    setFormError('');
    try {
      const created = await createBoard({ name, description });
      setCreating(false);
      navigate(`/boards/${created.slug}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (target) => {
    if (!window.confirm(`Delete "${target.name}" and all of its tasks? This cannot be undone.`)) return;
    await deleteBoard(target.slug);
    // Closing the open tab leaves nothing selected, so fall back to whichever
    // board the refreshed list puts first.
    if (target.slug === activeSlug) navigate('/boards', { replace: true });
  };

  return (
    <BoardLayout board={board}>
      <NetworkStatusBar isOnline={isOnline} isSyncing={isSyncing} message={message} />
      <TaskConflictDialog conflict={conflict} onResolve={resolveConflict} />

      <BoardTabs
        boards={boards}
        activeSlug={activeSlug}
        canCreate={canCreate && !creating}
        maxBoards={maxBoards}
        isAdmin={Boolean(user?.isAdmin)}
        onSelect={(next) => navigate(`/boards/${next}`)}
        onCreate={() => setCreating(true)}
        onDelete={handleDelete}
      />

      {creating && (
        <NewBoardForm
          onSubmit={handleCreate}
          onCancel={() => { setCreating(false); setFormError(''); }}
          busy={busy}
          error={formError}
        />
      )}

      {error && <p style={emptyStyle}>{error}</p>}
      {!loading && !error && boards.length === 0 && (
        <p style={emptyStyle}>
          {user?.isAdmin
            ? 'No boards yet. Create one to get started.'
            : 'You are not a member of any board yet. Ask the group leader to invite you.'}
        </p>
      )}

      {board && <BoardView boardId={board.slug} board={board} submitAction={submitAction} />}
    </BoardLayout>
  );
}

/*
 * Membership for the board in the URL.
 *
 * The same tab strip as the boards page, so a board created there is on this
 * page too and switching boards does not mean going back. The tabs are
 * read-only here — a board is deleted from the boards page, not from the screen
 * for managing who is on it.
 */
function MembersPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { boards, loading, error } = useBoards();

  const activeSlug = slug || boards[0]?.slug;
  const board = boards.find((b) => b.slug === activeSlug);

  return (
    <BoardLayout board={board}>
      <BoardTabs
        boards={boards}
        activeSlug={activeSlug}
        canCreate={false}
        isAdmin={false}
        onSelect={(next) => navigate(`/members/${next}`)}
      />

      {error && <p style={emptyStyle}>{error}</p>}
      {!loading && !error && boards.length === 0 && (
        <p style={emptyStyle}>
          You are not a member of any board yet. Ask the group leader to invite you.
        </p>
      )}

      {board && <MemberManager boardId={board.slug} board={board} />}
    </BoardLayout>
  );
}

const emptyStyle = { color: '#6b7280', fontSize: '14px' };

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/boards" element={<BoardPage />} />
        <Route path="/boards/:slug" element={<BoardPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/:slug" element={<MembersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/boards" replace />} />
    </Routes>
  );
}
