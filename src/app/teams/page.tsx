"use client";

import { useState } from "react";
import {
    useTeams,
    useCreateTeam,
    useUpdateTeam,
    useDeleteTeam,
    useAddTeamMember,
    useRemoveTeamMember,
    type Team,
} from "@/hooks/use-teams";
import { useCompanies } from "@/hooks/use-companies";
import { useUsers } from "@/hooks/use-users";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Plus,
    Pencil,
    Trash2,
    UserPlus,
    UserMinus,
    Users,
    Eye,
    ShoppingCart,
    UsersRound,
} from "lucide-react";
import { toast } from "sonner";

type TeamFormData = {
    company_id: string;
    name: string;
    description: string;
    can_other_teams_see: boolean;
    can_other_teams_book: boolean;
};

const defaultForm: TeamFormData = {
    company_id: "",
    name: "",
    description: "",
    can_other_teams_see: true,
    can_other_teams_book: false,
};

export default function TeamsPage() {
    const [filterCompany, setFilterCompany] = useState<string>("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editTeam, setEditTeam] = useState<Team | null>(null);
    const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
    const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [form, setForm] = useState<TeamFormData>(defaultForm);

    const params = filterCompany ? { company_id: filterCompany } : undefined;
    const { data: teamsData, isLoading } = useTeams(params);
    const { data: companiesData } = useCompanies();
    const { data: usersData } = useUsers(filterCompany ? { company_id: filterCompany } : undefined);

    const createMutation = useCreateTeam();
    const updateMutation = useUpdateTeam();
    const deleteMutation = useDeleteTeam();
    const addMemberMutation = useAddTeamMember();
    const removeMemberMutation = useRemoveTeamMember();

    const teams = teamsData?.data || [];
    const companies = companiesData?.data || [];
    const users = usersData?.data || [];

    function openCreate() {
        setForm({ ...defaultForm, company_id: filterCompany });
        setCreateOpen(true);
    }

    function openEdit(team: Team) {
        setForm({
            company_id: team.company_id,
            name: team.name,
            description: team.description || "",
            can_other_teams_see: team.can_other_teams_see,
            can_other_teams_book: team.can_other_teams_book,
        });
        setEditTeam(team);
    }

    async function handleCreate() {
        if (!form.company_id || !form.name.trim()) {
            toast.error("Company and team name are required");
            return;
        }
        try {
            await createMutation.mutateAsync({
                company_id: form.company_id,
                name: form.name.trim(),
                description: form.description || undefined,
                can_other_teams_see: form.can_other_teams_see,
                can_other_teams_book: form.can_other_teams_book,
            });
            toast.success("Team created");
            setCreateOpen(false);
        } catch {
            toast.error("Failed to create team");
        }
    }

    async function handleUpdate() {
        if (!editTeam) return;
        try {
            await updateMutation.mutateAsync({
                id: editTeam.id,
                data: {
                    name: form.name.trim(),
                    description: form.description || null,
                    can_other_teams_see: form.can_other_teams_see,
                    can_other_teams_book: form.can_other_teams_book,
                },
            });
            toast.success("Team updated");
            setEditTeam(null);
        } catch {
            toast.error("Failed to update team");
        }
    }

    async function handleDelete() {
        if (!deleteTeam) return;
        try {
            await deleteMutation.mutateAsync(deleteTeam.id);
            toast.success("Team deleted");
            setDeleteTeam(null);
        } catch {
            toast.error("Failed to delete team");
        }
    }

    async function handleAddMember() {
        if (!addMemberTeam || !selectedUserId) return;
        try {
            await addMemberMutation.mutateAsync({
                teamId: addMemberTeam.id,
                userId: selectedUserId,
            });
            toast.success("Member added");
            setSelectedUserId("");
        } catch {
            toast.error("Failed to add member");
        }
    }

    async function handleRemoveMember(teamId: string, userId: string) {
        try {
            await removeMemberMutation.mutateAsync({ teamId, userId });
            toast.success("Member removed");
        } catch {
            toast.error("Failed to remove member");
        }
    }

    const TeamForm = () => (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label>Company</Label>
                <Select
                    value={form.company_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, company_id: v }))}
                    disabled={!!editTeam}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                        {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>Team Name</Label>
                <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Abu Dhabi Team"
                />
            </div>
            <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description"
                />
            </div>
            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                        <p className="text-sm font-medium">Other teams can see assets</p>
                        <p className="text-xs text-muted-foreground">
                            Assets visible to users in other teams
                        </p>
                    </div>
                    <Switch
                        checked={form.can_other_teams_see}
                        onCheckedChange={(v) => setForm((p) => ({ ...p, can_other_teams_see: v }))}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                        <p className="text-sm font-medium">Other teams can book assets</p>
                        <p className="text-xs text-muted-foreground">
                            Assets bookable by users in other teams
                        </p>
                    </div>
                    <Switch
                        checked={form.can_other_teams_book}
                        onCheckedChange={(v) => setForm((p) => ({ ...p, can_other_teams_book: v }))}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <>
            <AdminHeader
                icon={UsersRound}
                title="Teams"
                description="Segment assets by team within a company. Control visibility and booking access between teams."
                actions={
                    <Button onClick={openCreate} size="sm">
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Team
                    </Button>
                }
            />

            <div className="p-6 space-y-4">
                {/* Filter */}
                <div className="flex items-center gap-3">
                    <Select value={filterCompany} onValueChange={setFilterCompany}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All companies</SelectItem>
                            {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Teams list */}
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading teams...</p>
                ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Users className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm">No teams yet</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {teams.map((team) => (
                            <Card key={team.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-base">{team.name}</CardTitle>
                                            {team.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {team.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEdit(team)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteTeam(team)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Toggles */}
                                    <div className="flex gap-2 flex-wrap">
                                        <Badge
                                            variant={
                                                team.can_other_teams_see ? "secondary" : "outline"
                                            }
                                            className="gap-1 text-xs"
                                        >
                                            <Eye className="h-3 w-3" />
                                            {team.can_other_teams_see ? "Visible" : "Private"}
                                        </Badge>
                                        <Badge
                                            variant={
                                                team.can_other_teams_book ? "secondary" : "outline"
                                            }
                                            className="gap-1 text-xs"
                                        >
                                            <ShoppingCart className="h-3 w-3" />
                                            {team.can_other_teams_book
                                                ? "Bookable"
                                                : "No ext. booking"}
                                        </Badge>
                                    </div>

                                    {/* Members */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Members ({team.members.length})
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                    setAddMemberTeam(team);
                                                    setSelectedUserId("");
                                                }}
                                            >
                                                <UserPlus className="h-3 w-3 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            {team.members.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    No members yet
                                                </p>
                                            ) : (
                                                team.members.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="flex items-center justify-between text-xs"
                                                    >
                                                        <span className="truncate">
                                                            {m.user.name}{" "}
                                                            <span className="text-muted-foreground">
                                                                ({m.user.email})
                                                            </span>
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                                                            onClick={() =>
                                                                handleRemoveMember(
                                                                    team.id,
                                                                    m.user.id
                                                                )
                                                            }
                                                        >
                                                            <UserMinus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Team</DialogTitle>
                    </DialogHeader>
                    <TeamForm />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Creating..." : "Create Team"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit dialog */}
            <Dialog open={!!editTeam} onOpenChange={(o) => !o && setEditTeam(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team</DialogTitle>
                    </DialogHeader>
                    <TeamForm />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTeam(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add member dialog */}
            <Dialog open={!!addMemberTeam} onOpenChange={(o) => !o && setAddMemberTeam(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Member to {addMemberTeam?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users
                                    .filter(
                                        (u) =>
                                            !addMemberTeam?.members.some((m) => m.user.id === u.id)
                                    )
                                    .map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name} — {u.email}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {users.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Select a company filter to see users
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddMemberTeam(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddMember}
                            disabled={!selectedUserId || addMemberMutation.isPending}
                        >
                            Add Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <AlertDialog open={!!deleteTeam} onOpenChange={(o) => !o && setDeleteTeam(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{deleteTeam?.name}</strong>? This will remove the team
                            and all member assignments. Assets assigned to this team will lose their
                            team association.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
