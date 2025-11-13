import React from 'react';

export default function DashboardCard({ title, value, hint }: { title:string; value: string | number; hint?:string }) {
  return (
    <div className="card glass p-4 rounded-xl">
      <div className="tiny muted">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint ? <div className="tiny muted mt-2">{hint}</div> : null}
    </div>
  );
}
