import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, AlertTriangle, Ban, Check, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserReport } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [reportsList, setReportsList] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList: UserProfile[] = [];
      usersSnap.forEach((d) => {
        uList.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setUsersList(uList);

      // Load reports
      const reportsSnap = await getDocs(collection(db, 'reports'));
      const rList: UserReport[] = [];
      reportsSnap.forEach((d) => {
        rList.push({ id: d.id, ...d.data() } as UserReport);
      });
      setReportsList(rList);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleBanUser = async (targetUid: string, currentStatus?: boolean) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      isBanned: !currentStatus
    });
    setUsersList((prev) =>
      prev.map((u) => (u.uid === targetUid ? { ...u, isBanned: !currentStatus } : u))
    );
  };

  const handleToggleAdminStatus = async (targetUid: string, currentStatus?: boolean) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      isAdmin: !currentStatus
    });
    setUsersList((prev) =>
      prev.map((u) => (u.uid === targetUid ? { ...u, isAdmin: !currentStatus } : u))
    );
  };

  if (!userProfile?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 frosted-card rounded-3xl p-8 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-pink-500 mx-auto" />
        <h3 className="font-bold text-lg text-white">Admin Access Restricted</h3>
        <p className="text-xs text-slate-400">
          You need administrator privileges to view this management console.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-24 md:pb-6">
      
      {/* Header */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide">Admin Control Panel</h2>
            <p className="text-xs text-slate-400">Platform governance, user management & security reports</p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 flex items-center space-x-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="frosted-card rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Registered Users</p>
            <h3 className="text-xl font-black text-white">{usersList.length}</h3>
          </div>
        </div>

        <div className="frosted-card rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/20">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Banned Accounts</p>
            <h3 className="text-xl font-black text-white">
              {usersList.filter((u) => u.isBanned).length}
            </h3>
          </div>
        </div>

        <div className="frosted-card rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-2xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Safety Reports</p>
            <h3 className="text-xl font-black text-white">{reportsList.length}</h3>
          </div>
        </div>
      </div>

      {/* User Management Directory */}
      <div className="frosted-card rounded-3xl p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-base text-white">User Directory & Status Control</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">User</th>
                <th className="py-3 px-2">Email / Phone</th>
                <th className="py-3 px-2">Role</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersList.map((u) => (
                <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2 flex items-center space-x-2.5">
                    <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-white text-xs">{u.displayName}</p>
                      <span className="text-[10px] text-indigo-400">{u.username || '@member'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-300">
                    <div>{u.email}</div>
                    <div className="text-[10px] text-slate-400">{u.phoneNumber || 'No phone'}</div>
                  </td>
                  <td className="py-3 px-2">
                    {u.isAdmin ? (
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-bold rounded-md text-[10px]">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[10px]">
                        Member
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {u.isBanned ? (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded-md text-[10px]">
                        Banned
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded-md text-[10px]">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right space-x-2">
                    <button
                      onClick={() => handleToggleAdminStatus(u.uid, u.isAdmin)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[10px] font-semibold"
                    >
                      {u.isAdmin ? 'Demote' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => handleToggleBanUser(u.uid, u.isBanned)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                        u.isBanned
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-600/80 hover:bg-red-500 text-white'
                      }`}
                    >
                      {u.isBanned ? 'Unban' : 'Ban User'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
