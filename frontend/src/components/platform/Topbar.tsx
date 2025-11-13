import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { IconAdd } from './icons';

export default function Topbar({ onAdd }: { onAdd?: ()=>void }) {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-between p-4 glass card glass-outline">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-extrabold">Lunivera Global</div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary flex items-center gap-2" onClick={onAdd}><IconAdd/> Add Owner</button>
        <button className="p-2 rounded-full glass-outline" onClick={toggle}>{dark ? 'Light' : 'Dark'}</button>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="tiny">{user.fullName ?? user.email}</div>
            <button className="px-3 py-1 border rounded" onClick={() => logout()}>Sign Out</button>
          </div>
        ) : (
          <a className="px-3 py-1 border rounded" href="/login">Sign In</a>
        )}
      </div>
    </div>
  );
}
