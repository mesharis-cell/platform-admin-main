"use client";

/**
 * Assets Inbound Page
 * 
 * Features:
 * - List of inbound asset requests
 * - Create new request via multi-step modal
 * - Search and filter
 * - Delete and status management
 */

import { useState } from "react";
import { useInboundRequests } from "@/hooks/use-inbound-requests";
import { CreateInboundRequestDialog } from "@/components/assets/create-inbound-request-dialog";
import {
  Plus,
  Search,
  Package,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InboundRequestStatus } from "@/types/inbound-request";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_COLORS: Record<InboundRequestStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_PROGRESS: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AssetsInboundPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, isLoading, refetch } = useInboundRequests({ search_term: search });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inbound Asset Requests
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Manage incoming asset requests
          </p>
        </div>
        <Button
          size="lg"
          className="font-mono"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Request
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, item name, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 font-mono"
          />
        </div>
      </div>

      {/* Data table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-mono font-semibold">Company</TableHead>
              <TableHead className="font-mono font-semibold">Incoming at</TableHead>
              <TableHead className="font-mono font-semibold">Status</TableHead>
              <TableHead className="font-mono font-semibold">Created</TableHead>
              <TableHead className="font-mono font-semibold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-mono mt-2">
                    Loading requests...
                  </p>
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground font-mono">
                    {search
                      ? "No requests match your search"
                      : "No inbound requests yet"}
                  </p>
                  {!search && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 font-mono"
                      onClick={() => setIsCreateOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Request
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono">
                    {request.company?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {format(request.incoming_at, "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs ${STATUS_COLORS[request.request_status]}`}
                    >
                      {request.request_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {format(request.created_at, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/inbound-request/${request.id}`}>
                      <Button variant="default">
                        Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <CreateInboundRequestDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          refetch();
        }}
      />
    </div>
  );
}