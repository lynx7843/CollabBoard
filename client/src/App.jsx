import { BoardLayout } from './components/BoardLayout';
import { BoardView } from './components/BoardView';
import { MemberManager } from './components/MemberManager';

export default function App() {
  
  const dummyMembers = [
    { _id: '1', name: 'Sarah Connor', email: 'sarah@example.com' },
    { _id: '2', name: 'John Smith', email: 'john@example.com' }
  ];

  return (
    <BoardLayout>
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
