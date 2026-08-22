import { Routes, Route, Navigate } from 'react-router-dom';
import { BoardLayout } from './components/BoardLayout';
import { BoardView } from './components/BoardView';
import { MemberManager } from './components/MemberManager';
import TaskConflictDialog from './components/TaskConflictDialog';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useBoardPersistence } from './utils/hooks/useBoardPersistence';

const BOARD_ID = 'group-13';

function BoardPage() {
  const { conflict, resolveConflict, submitAction } = useBoardPersistence(BOARD_ID, null);

  const dummyMembers = [
    { _id: '1', name: 'Sarah Connor', email: 'sarah@example.com' },
    { _id: '2', name: 'John Smith', email: 'john@example.com' }
  ];

  return (
    <BoardLayout>
      <TaskConflictDialog conflict={conflict} onResolve={resolveConflict} />
      {/* The main Kanban board UI */}
      <BoardView boardId={BOARD_ID} submitAction={submitAction} />


      <div style={{ marginTop: '64px', borderTop: '1px solid #d4d4d4', paddingTop: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>
          Settings Sandbox
        </h2>
        <MemberManager boardId="mock-board-id" initialMembers={dummyMembers} />
      </div>
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
      </Route>
      <Route path="*" element={<Navigate to="/boards" replace />} />
    </Routes>
  );
}
