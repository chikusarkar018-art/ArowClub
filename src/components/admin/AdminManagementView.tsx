import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ShieldCheck, Plus, Edit2, Trash2, CheckCircle2,
  XCircle, UserCheck, Key, Mail, User, X
} from 'lucide-react';
import { AdminStaffUser } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const AdminManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [admins, setAdmins] = useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminStaffUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<any>('admin');
  const [formPassword, setFormPassword] = useState('admin123');

  const fetchAdmins = async () => {
    try {
      const data = await api.getAdminStaffList();
      if (data?.admins) {
        setAdmins(data.admins);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await api.updateAdminStaff(editingAdmin.id, {
          username: formUsername,
          email: formEmail,
          role: formRole,
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('Admin staff updated successfully!', 'success');
      } else {
        await api.createAdminStaff({
          username: formUsername,
          email: formEmail,
          role: formRole,
          password: formPassword,
          status: 'active',
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('New admin staff member created!', 'success');
      }
      setShowAddModal(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to save admin user', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this admin staff member?')) return;
    try {
      await api.deleteAdminStaff(id, admin?.username || 'SuperAdmin');
      showToast('Admin staff member removed', 'info');
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete admin', 'error');
    }
  };

  const openAdd = () => {
    setEditingAdmin(null);
    setFormUsername('');
    setFormEmail('');
    setFormRole('admin');
    setFormPassword('admin123');
    setShowAddModal(true);
  };

  const openEdit = (a: AdminStaffUser) => {
    setEditingAdmin(a);
    setFormUsername(a.username);
    setFormEmail(a.email);
    setFormRole(a.role);
    setShowAddModal(true);
  };

  const mockAdmins: AdminStaffUser[] = [
    { id: 'a1', username: 'Super Admin', email: 'admin@colourprediction.com', role: 'super_admin', status: 'active', lastLogin: '26/05/2024 11:45 AM' },
    { id: 'a2', username: 'Amit Finance', email: 'finance@colourprediction.com', role: 'manager', status: 'active', lastLogin: '26/05/2024 10:15 AM' },
    { id: 'a3', username: 'Pooja Support', email: 'support@colourprediction.com', role: 'operator', status: 'active', lastLogin: '26/05/2024 09:30 AM' },
    { id: 'a4', username: 'Rajesh Moderator', email: 'operator@colourprediction.com', role: 'operator', status: 'active', lastLogin: '25/05/2024 08:20 PM' },
  ];

  const displayList = admins.length > 0 ? admins : mockAdmins;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'admin':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case 'manager':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= ALL ADMINS TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">All Admins</h3>
            <p className="text-xs text-slate-400 mt-0.5">Control administrative access and system permissions</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Admin</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Admin Name</th>
                <th className="pb-3 px-3">Email</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Last Login</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {displayList.slice((currentPage - 1) * 20, currentPage * 20).map((a) => {
                const isActive = a.status === 'active';
                return (
                  <tr key={a.id} className="hover:bg-[#16182c]/40 transition">
                    <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                        {a.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{a.username}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{a.email}</td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(a.role)} capitalize`}>
                        {a.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{a.lastLogin || '26/05/2024 11:45 AM'}</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(a)}
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {a.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="w-7 h-7 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-400 flex items-center justify-center transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={displayList.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="admins"
        />
      </div>

      {/* ================= MODAL: ADD / EDIT ADMIN ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                {editingAdmin ? 'Edit Admin Staff' : 'Add New Admin Staff'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name / Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Verma"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. finance@colourprediction.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Finance Manager</option>
                    <option value="operator">Support Operator</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                {!editingAdmin && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold"
                >
                  Save Admin Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
