// src/features/platform/pages/PlatformDashboard.tsx
import React, { useState, type JSX } from 'react';
import Topbar from '../components/Topbar';
import DashboardCard from '../components/DashboardCard';
import CreateOwnerModal from '../components/createOwnerModal';
// import EditOwnerModal from '../components/EditOwnerModal';
import ResetPasswordModal from '../components/ResetPasswordModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import * as platformAPI from '../../../services/platform.services';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Owner, PlatformStats } from '../../../types';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function PlatformDashboard(): JSX.Element {
  const qc = useQueryClient();

  // Load stats and owner list
  const statsQ = useQuery<PlatformStats>({
    queryKey: ['platform', 'stats'],
    queryFn: () => platformAPI.getPlatformStats(),
    staleTime: 1000 * 60 * 2,
  });

  const ownersQ = useQuery<Owner[]>({
    queryKey: ['platform', 'owners'],
    queryFn: async () => {
      const result = await platformAPI.getAllOwners();
      return result;
    },
    staleTime: 1000 * 30,
  });

  const owners: Owner[] = ownersQ.data ?? [];

  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<Owner | null>(null);

  // ---- Handlers ----
  const handleCreate = async (payload: any) => {
    try {
      await platformAPI.createOwner(payload);
      toast.success('Owner created successfully');
      await qc.invalidateQueries({ queryKey: ['platform', 'owners'] });
      await qc.invalidateQueries({ queryKey: ['platform', 'stats'] });
      setOpenCreate(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create owner');
    }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      await platformAPI.updateOwner(id, payload);
      toast.success('Owner updated successfully');
      await qc.invalidateQueries({ queryKey: ['platform', 'owners'] });
      setOpenEdit(false);
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update owner');
    }
  };

  const handleToggleStatus = async (owner: Owner) => {
    try {
      await platformAPI.toggleOwnerStatus(owner._id, !owner.isActive);
      toast.success(owner.isActive ? 'Owner deactivated' : 'Owner activated');
      await qc.invalidateQueries({ queryKey: ['platform', 'owners'] });
    } catch (err: any) {
      toast.error('Failed to toggle owner status');
    }
  };

  const handleResetPassword = async (id: string, newPassword: string) => {
    try {
      await platformAPI.resetOwnerPassword(id, newPassword);
      toast.success('Password reset successfully');
      setOpenReset(false);
      setSelected(null);
    } catch (err: any) {
      toast.error('Failed to reset password');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await platformAPI.deleteOwner(id);
      toast.success('Owner deleted');
      await qc.invalidateQueries({ queryKey: ['platform', 'owners'] });
      setOpenDelete(false);
      setSelected(null);
    } catch (err: any) {
      toast.error('Failed to delete owner');
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar onAdd={() => setOpenCreate(true)} />

      <main className="p-6">
        {/* --- KPI GRID --- */}
        <motion.div
          className="dashboard-grid mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DashboardCard
            title="Total Restaurant Owners"
            value={statsQ.data?.totalOwners ?? 0}
            hint="All owners on platform"
          />
          <DashboardCard
            title="Active Owners"
            value={statsQ.data?.activeOwners ?? 0}
            hint="Currently active"
          />
          <DashboardCard
            title="New Owners (30 days)"
            value={statsQ.data?.newOwnersThisMonth ?? 0}
            hint="Newly onboarded"
          />
        </motion.div>

        {/* --- OWNER MANAGEMENT TABLE --- */}
        <div className="card glass p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Registered Restaurant Owners</h2>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['platform', 'owners'] })}
              className="px-3 py-1 border rounded hover:bg-white/5 transition"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Phone</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.length > 0 ? (
                  owners.map((o) => (
                    <tr key={o._id} className="border-t border-white/10 hover:bg-white/5 transition">
                      <td className="py-2 font-medium">{o.fullName}</td>
                      <td className="py-2">{o.email}</td>
                      <td className="py-2">{o.phone ?? '—'}</td>
                      <td className="py-2">
                        {o.isActive ? (
                          <span className="badge active px-2 py-1 rounded bg-green-500/20 text-green-400">Active</span>
                        ) : (
                          <span className="badge inactive px-2 py-1 rounded bg-red-500/20 text-red-400">Inactive</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 space-x-2">
                        <button
                          onClick={() => {
                            setSelected(o);
                            setOpenEdit(true);
                          }}
                          className="px-2 py-1 border rounded hover:bg-white/5 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelected(o);
                            setOpenReset(true);
                          }}
                          className="px-2 py-1 border rounded hover:bg-white/5 text-xs"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(o)}
                          className="px-2 py-1 border rounded hover:bg-white/5 text-xs"
                        >
                          {o.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setSelected(o);
                            setOpenDelete(true);
                          }}
                          className="px-2 py-1 border rounded hover:bg-red-500/20 text-xs text-red-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">
                      No owners found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}
      <CreateOwnerModal open={openCreate} onClose={() => setOpenCreate(false)} onCreate={handleCreate} />

      {/* <EditOwnerModal
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setSelected(null);
        }}
        owner={selected}
        onUpdate={handleUpdate}
      /> */}

      <ResetPasswordModal
        open={openReset}
        onClose={() => {
          setOpenReset(false);
          setSelected(null);
        }}
        owner={selected}
        onReset={handleResetPassword}
      />

      <ConfirmDeleteModal
        open={openDelete}
        onClose={() => {
          setOpenDelete(false);
          setSelected(null);
        }}
        owner={selected}
        onConfirm={handleDelete}
      />
    </div>
  );
}
