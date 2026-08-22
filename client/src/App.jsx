import { BoardLayout } from './components/BoardLayout';
import { BoardView } from './components/BoardView';
import { MemberManager } from './components/MemberManager';
import TaskConflictDialog from './components/TaskConflictDialog';
import { useBoardPersistence } from './utils/hooks/useBoardPersistence';

export default function App() {
  const { conflict, resolveConflict } = useBoardPersistence('group-13', null);

  const dummyMembers = [
    { _id: '1', name: 'Sarah Connor', email: 'sarah@example.com' },
    { _id: '2', name: 'John Smith', email: 'john@example.com' }
  ];

  return (
    <BoardLayout>
      <TaskConflictDialog conflict={conflict} onResolve={resolveConflict} />
      {/* The main Kanban board UI */}
      <BoardView />
      
      
      <div style={{ marginTop: '64px', borderTop: '1px solid #d4d4d4', paddingTop: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>
          Settings Sandbox
        </h2>
        <MemberManager boardId="mock-board-id" initialMembers={dummyMembers} />
      </div>
    </BoardLayout>
  );
}
