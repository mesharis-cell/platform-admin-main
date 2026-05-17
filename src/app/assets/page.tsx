"use client";

import { useState } from "react";
import { Package, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { AssetTable } from "@/components/assets/asset-table";
import { AssetWizard } from "@/components/assets/asset-wizard";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/contexts/platform-context";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { hasPermission } from "@/lib/auth/permissions";
import { useToken } from "@/lib/auth/use-token";

export default function AssetsPage() {
    const router = useRouter();
    const { user } = useToken();
    const { platform } = usePlatform();
    const [showWizard, setShowWizard] = useState(false);

    const canCreateAsset = hasPermission(user, ADMIN_ACTION_PERMISSIONS.assetsCreate);
    const canBulkUploadAsset = hasPermission(user, ADMIN_ACTION_PERMISSIONS.assetsBulkUpload);
    const bulkUploadEnabled = platform?.features?.enable_asset_bulk_upload === true;

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Package}
                title="INVENTORY"
                description="Raw Stock Records · Optional Group Folding · Operational Asset View"
                actions={
                    canCreateAsset || (canBulkUploadAsset && bulkUploadEnabled) ? (
                        <div className="flex gap-2">
                            {canBulkUploadAsset && bulkUploadEnabled && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="font-mono"
                                    onClick={() => router.push("/assets/bulk-upload")}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bulk Upload
                                </Button>
                            )}
                            {canCreateAsset && (
                                <Button onClick={() => setShowWizard(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Asset
                                </Button>
                            )}
                        </div>
                    ) : undefined
                }
            />
            <div className="mx-auto max-w-[1600px] px-6 py-8">
                <AssetTable />
            </div>
            <AssetWizard open={showWizard} onOpenChange={setShowWizard} />
        </div>
    );
}
