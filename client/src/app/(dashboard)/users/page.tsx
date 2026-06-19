"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Mail,
  UserCheck,
  Shield,
  Clock,
  Edit2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetUsersQuery,
  useUpdateUserMutation,
  useAssignUserRoleMutation,
  useRemoveUserRoleMutation,
  useGetRolesQuery
} from "@/features/dashboard/dashboardApi";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Queries & Mutations
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
  const { data: rolesData } = useGetRolesQuery();
  const [updateUser, { isLoading: updatingUser }] = useUpdateUserMutation();
  const [assignUserRole] = useAssignUserRoleMutation();
  const [removeUserRole] = useRemoveUserRoleMutation();

  // Dialog State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form States
  const [userName, setUserName] = useState("");
  const [userStatus, setUserStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [userRoleId, setUserRoleId] = useState("");
  const [formError, setFormError] = useState("");

  const getUserName = (u: any) => {
    if (!u) return "";
    if (u.name) return u.name;
    return `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User";
  };

  const handleOpenEditDialog = (user: any) => {
    setFormError("");
    setSelectedUser(user);
    setUserName(getUserName(user));
    setUserStatus(user.status || "ACTIVE");
    setUserRoleId(user.roles && user.roles.length > 0 ? user.roles[0].id : "");
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName) {
      setFormError("Name is required.");
      return;
    }

    try {
      await updateUser({
        id: selectedUser.id,
        body: {
          name: userName,
          status: userStatus,
        },
      }).unwrap();

      const oldRoleId = selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0].id : "";
      if (userRoleId !== oldRoleId) {
        if (oldRoleId) {
          try {
            await removeUserRole({ userId: selectedUser.id, roleId: oldRoleId }).unwrap();
          } catch (err) {
            console.warn("Failed to remove old role:", err);
          }
        }
        if (userRoleId) {
          await assignUserRole({ userId: selectedUser.id, roleId: userRoleId }).unwrap();
        }
      }

      setIsUserDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to update user profile.");
    }
  };

  const filteredUsers = usersData?.items?.filter((u) => {
    const fullName = getUserName(u).toLowerCase();
    const email = (u.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in text-neutral-900 dark:text-zinc-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50 font-display">
            Users & Role Permissions
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
            Audit user accounts, roles, and status configurations.
          </p>
        </div>
      </div>

      {/* Filter and Content Card */}
      <Card className="border border-neutral-200/80 dark:border-zinc-800 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-3xl p-6 bg-white dark:bg-zinc-900 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-50 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-zinc-800">
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">User</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">Role</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">Joined Date</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-50 dark:border-zinc-800/40 last:border-0">
                    <td className="py-4"><div className="h-4 w-32 bg-neutral-100 dark:bg-zinc-800 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-16 bg-neutral-100 dark:bg-zinc-800 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-12 bg-neutral-100 dark:bg-zinc-800 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-20 bg-neutral-100 dark:bg-zinc-800 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-10 bg-neutral-100 dark:bg-zinc-800 animate-pulse rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  // Determine roles
                  const displayRoles = user.roles && user.roles.length > 0
                    ? user.roles.map((r: any) => r.role?.name).join(", ")
                    : "No Role";

                  return (
                    <tr key={user.id} className="border-b border-neutral-50 dark:border-zinc-800/50 last:border-0 hover:bg-neutral-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-zinc-100 text-white dark:text-neutral-900 font-bold font-display text-xs flex items-center justify-center">
                            {getUserName(user) ? getUserName(user)[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">{getUserName(user)}</p>
                            <p className="text-[10px] text-neutral-400 dark:text-zinc-550 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-300">
                          <Shield className="w-3 h-3 text-neutral-400" />
                          {displayRoles}
                        </span>
                      </td>
                      <td className="py-4 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                            : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 text-[10px] text-neutral-400 dark:text-zinc-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          onClick={() => handleOpenEditDialog(user)}
                          variant="outline"
                          className="h-8 px-2.5 rounded-lg text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200 hover:bg-neutral-50 dark:hover:bg-zinc-800 border-neutral-200 dark:border-zinc-800 text-xs font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-neutral-400 font-medium">
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit User Form Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-zinc-50 font-display">
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-zinc-400">
              Modify account state or system credentials.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Full Name</Label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Full Name"
                className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-950/50 text-neutral-900 dark:text-zinc-50"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Email Address (Read-only)</Label>
              <Input
                value={selectedUser?.email || ""}
                disabled
                className="h-10 text-xs border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 text-neutral-400 dark:text-zinc-600"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">System Role</Label>
              <select
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
                className="w-full h-10 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 text-xs bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-50 focus:outline-none focus:border-neutral-900 dark:focus:border-zinc-300 focus:ring-1 focus:ring-neutral-900/10"
              >
                <option value="">No Role Assigned</option>
                {rolesData?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-550 uppercase tracking-wider">Status</Label>
              <select
                value={userStatus}
                onChange={(e: any) => setUserStatus(e.target.value)}
                className="w-full h-10 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 text-xs bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-50 focus:outline-none focus:border-neutral-900 dark:focus:border-zinc-300 focus:ring-1 focus:ring-neutral-900/10"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingUser}
                className="bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
              >
                {updatingUser ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
