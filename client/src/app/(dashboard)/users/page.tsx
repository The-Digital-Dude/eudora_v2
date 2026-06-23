"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  Mail,
  Search,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAssignUserRoleMutation,
  useGetRolesQuery,
  useGetUsersQuery,
  useRemoveUserRoleMutation,
  useUpdateUserMutation,
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

      const oldRoleId =
        selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0].id : "";
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

  const filteredUsers =
    usersData?.items?.filter((u) => {
      const fullName = getUserName(u).toLowerCase();
      const email = (u.email || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    }) || [];

  return (
    <div className="animate-fade-in space-y-6 text-neutral-900 dark:text-zinc-50">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50">
            Users & Role Permissions
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
            Audit user accounts, roles, and status configurations.
          </p>
        </div>
      </div>

      {/* Filter and Content Card */}
      <Card className="space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.015)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border-neutral-200 bg-white pl-9 text-xs text-neutral-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-zinc-800">
                <th className="pb-3 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  User
                </th>
                <th className="pb-3 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  Role
                </th>
                <th className="pb-3 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  Status
                </th>
                <th className="pb-3 text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  Joined Date
                </th>
                <th className="pb-3 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-50 last:border-0 dark:border-zinc-800/40"
                  >
                    <td className="py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-10 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  // Determine roles
                  const displayRoles =
                    user.roles && user.roles.length > 0
                      ? user.roles.map((r: any) => r.role?.name).join(", ")
                      : "No Role";

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-neutral-900">
                            {getUserName(user) ? getUserName(user)[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-900 dark:text-zinc-50">
                              {getUserName(user)}
                            </p>
                            <p className="dark:text-zinc-550 mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                              <Mail className="h-3 w-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-300">
                          <Shield className="h-3 w-3 text-neutral-400" />
                          {displayRoles}
                        </span>
                      </td>
                      <td className="py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            user.status === "ACTIVE"
                              ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "border border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 text-[10px] font-medium text-neutral-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          onClick={() => handleOpenEditDialog(user)}
                          variant="outline"
                          className="h-8 rounded-lg border-neutral-200 px-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-medium text-neutral-400">
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
        <DialogContent className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-neutral-900 dark:text-zinc-50">
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-zinc-400">
              Modify account state or system credentials.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500 dark:border-rose-900/30 dark:bg-rose-950/20">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                Full Name
              </Label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Full Name"
                className="h-10 border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                Email Address (Read-only)
              </Label>
              <Input
                value={selectedUser?.email || ""}
                disabled
                className="h-10 border-neutral-200 bg-neutral-50 text-xs text-neutral-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                System Role
              </Label>
              <select
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300"
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
              <Label className="dark:text-zinc-550 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Status
              </Label>
              <select
                value={userStatus}
                onChange={(e: any) => setUserStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserDialogOpen(false)}
                className="h-10 rounded-xl border-neutral-200 text-xs font-semibold text-neutral-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingUser}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
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
