"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  Clock,
  Edit2,
  Mail,
  Search,
  Shield,
} from "lucide-react";
import React, { useState } from "react";

import { DataTable, SortableHeader } from "@/components/data-table";
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
  type User,
  useAssignUserRoleMutation,
  useGetRolesQuery,
  useGetUsersQuery,
  useRemoveUserRoleMutation,
  useUpdateUserMutation,
} from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

export default function UsersPage() {
  const { values, setValue, setValues } = useListQueryState(
    { search: "", page: 1, pageSize: 10, sortBy: "", sortOrder: "asc" },
    { pageKey: "page" },
  );
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  // Queries & Mutations
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({
    page: values.page,
    limit: values.pageSize,
    search: values.search || undefined,
    sortBy: values.sortBy || undefined,
    sortOrder: values.sortOrder,
  });
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

  // Already filtered by the server.
  const filteredUsers = usersData?.items || [];
  const totalMatching = usersData?.total ?? 0;

  const columns: ColumnDef<User, any>[] = [
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column} label="User" />,
      cell: ({ row }) => {
        const user = row.original as any;
        return (
          <div className="flex items-center gap-3">
            <div className="font-display flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background">
              {getUserName(user) ? getUserName(user)[0].toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{getUserName(user)}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Role
        </span>
      ),
      cell: ({ row }) => {
        const user = row.original as any;
        const displayRoles =
          user.roles && user.roles.length > 0
            ? user.roles.map((r: any) => r.role?.name).join(", ")
            : "No Role";
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Shield className="h-3 w-3 text-muted-foreground" />
            {displayRoles}
          </span>
        );
      },
    },
    {
      id: "status",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Status
        </span>
      ),
      cell: ({ row }) => {
        const status = (row.original as any).status;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              status === "ACTIVE"
                ? "border border-success/20 bg-success/10 text-success"
                : "border border-border bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} label="Joined Date" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => (
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Actions
        </span>
      ),
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            onClick={() => handleOpenEditDialog(row.original)}
            variant="outline"
            className="h-8 rounded-lg border-border px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground"
          >
            <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Users & Role Permissions
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Audit user accounts, roles, and status configurations.
          </p>
        </div>
      </div>

      {/* Filter and Content Card */}
      <Card className="space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-10 rounded-xl border-border bg-card pl-9 text-xs text-foreground"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={usersLoading}
          page={values.page}
          pageSize={values.pageSize}
          total={totalMatching}
          onPageChange={(next) => setValue("page", next)}
          onPageSizeChange={(size) => setValue("pageSize", size)}
          paginationLabel="user"
          sortBy={values.sortBy}
          sortOrder={values.sortOrder as "asc" | "desc"}
          onSortChange={(sortBy, sortOrder) => setValues({ sortBy, sortOrder })}
          emptyTitle="No users matching criteria"
        />
      </Card>

      {/* Edit User Form Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify account state or system credentials.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Full Name
              </Label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Full Name"
                className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Email Address (Read-only)
              </Label>
              <Input
                value={selectedUser?.email || ""}
                disabled
                className="h-10 border-border bg-muted/50 text-xs text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                System Role
              </Label>
              <select
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
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
              <Label className=" text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Status
              </Label>
              <select
                value={userStatus}
                onChange={(e: any) => setUserStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserDialogOpen(false)}
                className="h-10 rounded-xl border-border text-xs font-semibold text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingUser}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
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
