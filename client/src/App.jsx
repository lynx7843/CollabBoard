import { Routes, Route, Navigate } from 'react-router-dom';
import { BoardLayout } from './components/BoardLayout';
import { BoardView } from './components/BoardView';
import { MemberManager } from './components/MemberManager';
import TaskConflictDialog from './components/TaskConflictDialog';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useBoardPersistence } from './utils/hooks/useBoardPersistence';
import { NetworkStatusBar } from './utils/hooks/components/NetworkStatusBar';

const BOARD_ID = 'group-13';

function BoardPage() {
  const { conflict, resolveConflict, submitAction, isOnline, isSyncing, message } = useBoardPersistence(BOARD_ID, null);

  return (
    <BoardLayout>
      <NetworkStatusBar isOnline={isOnline} isSyncing={isSyncing} message={message} />
      <TaskConflictDialog conflict={conflict} onResolve={resolveConflict} />
      {/* The main Kanban board UI */}
      <BoardView boardId={BOARD_ID} submitAction={submitAction} />
    </BoardLayout>
  );
}

function MembersPage() {
  return (
    <BoardLayout>
      <MemberManager boardId={BOARD_ID} initialMembers={[]} />
    </BoardLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/boards" element={<BoardPage />} />
        <Route path="/members" element={<MembersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/boards" replace />} />
    </Routes>
  );
}
