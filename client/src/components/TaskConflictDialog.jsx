import { useState } from 'react';

const formatTask = (task) => task ? JSON.stringify(task, null, 2) : 'Latest task data is unavailable.';

export default function TaskConflictDialog({ conflict, onResolve }) {
  const [choice, setChoice] = useState('keepMine');
  if (!conflict) return null;

  const localTask = conflict.action?.task || conflict.action?.payload || conflict.action;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="task-conflict-title" className="task-conflict-backdrop">
      <section className="task-conflict-dialog">
        <h2 id="task-conflict-title">Task changed while you were editing</h2>
        <p>Another change was saved first. Review both versions before deciding what to keep.</p>
        <div className="task-conflict-versions">
          <div>
            <h3>Your changes</h3>
            <pre>{formatTask(localTask)}</pre>
          </div>
          <div>
            <h3>Latest on server</h3>
            <pre>{formatTask(conflict.latest)}</pre>
          </div>
        </div>
        <fieldset>
          <legend>Version to keep</legend>
          <label>
            <input type="radio" value="keepMine" checked={choice === 'keepMine'} onChange={() => setChoice('keepMine')} />
            Overwrite with my changes
          </label>
          <label>
            <input type="radio" value="useServer" checked={choice === 'useServer'} onChange={() => setChoice('useServer')} />
            Keep the server version
          </label>
        </fieldset>
        <div className="task-conflict-actions">
          <button type="button" onClick={() => onResolve(choice)}>Apply choice</button>
        </div>
      </section>
    </div>
  );
}