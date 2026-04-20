export type RecipientType = "ROLE" | "ENTITY_OWNER" | "EMAIL";
export type NotificationConditionField =
    | "company_id"
    | "entity_type"
    | "actor_role"
    | "workflow_code"
    | "workflow_status"
    | "lifecycle_state"
    | "billing_mode"
    | "request_type";
export type NotificationConditionOperator = "equals" | "in";

export interface NotificationCondition {
    field: NotificationConditionField;
    operator: NotificationConditionOperator;
    value: string | string[];
}

export interface EventMeta {
    key: string;
    label: string;
}

export interface EventGroup {
    label: string;
    events: EventMeta[];
}

export interface TemplateMeta {
    key: string;
    label: string;
}

export interface NotificationMeta {
    event_groups: EventGroup[];
    templates_by_event: Record<string, TemplateMeta[]>;
}
export type NotificationStatus =
    | "QUEUED"
    | "PROCESSING"
    | "SENT"
    | "FAILED"
    | "RETRYING"
    | "SKIPPED";
export type EntityType =
    | "ORDER"
    | "INBOUND_REQUEST"
    | "SERVICE_REQUEST"
    | "USER"
    | "SELF_BOOKING"
    | "SELF_PICKUP";

export interface SystemEvent {
    id: string;
    platform_id: string;
    event_type: string;
    entity_type: EntityType;
    entity_id: string;
    actor_id: string | null;
    actor_role: string | null;
    payload: Record<string, unknown>;
    occurred_at: string;
}

export interface NotificationRule {
    id: string;
    platform_id: string;
    event_type: string;
    recipient_type: RecipientType;
    recipient_value: string | null;
    template_key: string;
    company_id: string | null;
    is_enabled: boolean;
    sort_order: number;
    conditions: NotificationCondition[];
    created_at: string;
    updated_at: string;
}

export interface NotificationLog {
    id: string;
    platform_id: string;
    event_id: string;
    rule_id: string | null;
    recipient_email: string;
    recipient_type: RecipientType;
    recipient_value: string | null;
    template_key: string;
    subject: string | null;
    status: NotificationStatus;
    attempts: number;
    last_attempt_at: string | null;
    sent_at: string | null;
    message_id: string | null;
    error_message: string | null;
    created_at: string;
    event?: Pick<SystemEvent, "id" | "event_type" | "entity_type" | "entity_id" | "occurred_at">;
}
