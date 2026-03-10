"use client";

import { useMemo, useState } from "react";
import { Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useWorkflowDefinitions,
    useWorkflowInbox,
    type WorkflowLifecycleState,
} from "@/hooks/use-workflow-requests";

const LIFECYCLE_OPTIONS: WorkflowLifecycleState[] = ["OPEN", "ACTIVE", "DONE", "CANCELLED"];
const BADGE_VARIANT: Record<WorkflowLifecycleState, "default" | "secondary" | "outline"> = {
    OPEN: "outline",
    ACTIVE: "secondary",
    DONE: "default",
    CANCELLED: "outline",
};

export default function WorkflowInboxPage() {
    const [lifecycleState, setLifecycleState] = useState<string>("all");
    const [workflowCode, setWorkflowCode] = useState<string>("all");
    const { data: definitionsData } = useWorkflowDefinitions();
    const { data, isLoading } = useWorkflowInbox({
        lifecycle_state: lifecycleState === "all" ? undefined : lifecycleState,
        workflow_code: workflowCode === "all" ? undefined : workflowCode,
    });

    const definitions = definitionsData?.data || [];
    const workflows = useMemo(() => data?.data || [], [data?.data]);
    return (
        <div className="container mx-auto space-y-6 px-6 py-8">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                    <Workflow className="h-6 w-6" />
                    Workflow Inbox
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Cross-entity view of active internal workflows, grouped under one subsystem.
                </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
                <Select value={lifecycleState} onValueChange={setLifecycleState}>
                    <SelectTrigger className="w-full md:w-[220px]">
                        <SelectValue placeholder="Lifecycle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Lifecycle States</SelectItem>
                        {LIFECYCLE_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={workflowCode} onValueChange={setWorkflowCode}>
                    <SelectTrigger className="w-full md:w-[260px]">
                        <SelectValue placeholder="Workflow" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Workflow Types</SelectItem>
                        {definitions.map((definition) => (
                            <SelectItem key={definition.id} value={definition.code}>
                                {definition.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading workflow inbox...</p>
                    ) : workflows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No workflow requests match the current filters.
                        </p>
                    ) : (
                        workflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                className="space-y-3 rounded-lg border border-border/60 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{workflow.title}</p>
                                            <Badge
                                                variant={BADGE_VARIANT[workflow.lifecycle_state]}
                                            >
                                                {workflow.lifecycle_state}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {workflow.workflow_label} · {workflow.workflow_family} ·{" "}
                                            {workflow.entity_type.replace(/_/g, " ")} ·{" "}
                                            {workflow.status.replace(/_/g, " ")}
                                        </p>
                                        {workflow.description ? (
                                            <p className="text-sm text-muted-foreground">
                                                {workflow.description}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="text-right text-xs font-mono text-muted-foreground">
                                        <p>{workflow.requested_by_role}</p>
                                        <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
