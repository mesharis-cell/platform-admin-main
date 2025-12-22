'use client';

/**
 * Bulk Asset Upload Page - Data Import Terminal
 *
 * Design Concept: "Warehouse Data Processing Station"
 * - Terminal-style interface with technical readouts
 * - Grid background with zone markers
 * - Step-by-step upload flow with clear validation feedback
 * - Monospace typography with uppercase headers
 * - Orange accents for processing states
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Database,
  Loader2,
  XCircle,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { parseCSVFile } from '@/lib/utils/csv-utils';
import { downloadCSVTemplate } from '@/lib/utils/csv-utils';
import type { ParsedCSVRow, RowValidationError, BulkUploadResponse } from '@/types/bulk-upload';

type UploadState = 'idle' | 'parsing' | 'validating' | 'uploading' | 'success' | 'error';

export default function BulkUploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<RowValidationError[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    assets: Array<{ id: string; name: string; qrCode: string }>;
  } | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setState('parsing');
    setFile(selectedFile);
    setParsedRows([]);
    setParseErrors([]);
    setValidationErrors([]);

    try {
      const result = await parseCSVFile(selectedFile);

      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setState('error');
        toast.error('CSV parsing failed');
        return;
      }

      setParsedRows(result.data);
      setState('idle');
      toast.success(`Parsed ${result.data.length} rows successfully`);
    } catch (error) {
      setState('error');
      toast.error('Failed to parse CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data: BulkUploadResponse = await response.json();

      if (response.ok && data.success && data.data) {
        setUploadResult(data.data);
        setState('success');
        toast.success(`Successfully created ${data.data.created} assets!`);
      } else {
        // Validation errors
        setValidationErrors(data.details?.rowErrors || []);
        setState('error');
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      setState('error');
      toast.error('Failed to upload assets');
    }
  };

  const handleReset = () => {
    setState('idle');
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setValidationErrors([]);
    setUploadResult(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Zone Markers */}
      <div className="absolute top-8 left-8 font-mono text-[10px] text-muted-foreground/40 tracking-[0.2em] uppercase">
        ZONE: IMPORT-TERMINAL
      </div>
      <div className="absolute top-8 right-8 font-mono text-[10px] text-muted-foreground/40 tracking-[0.2em] uppercase">
        SEC-LEVEL: A2-STAFF
      </div>
      <div className="absolute bottom-8 right-8 font-mono text-[10px] text-muted-foreground/40 tracking-[0.2em] uppercase">
        PROTOCOL: BULK-IMPORT-V1
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" asChild className="font-mono">
                  <Link href="/admin/assets">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK TO ASSETS
                  </Link>
                </Button>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold font-mono uppercase tracking-tight">
                      BULK ASSET IMPORT
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider">
                      Mass Upload Terminal · CSV Processing
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
                <div className={`h-2 w-2 rounded-full ${
                  state === 'success' ? 'bg-emerald-500 animate-pulse' :
                  state === 'error' ? 'bg-red-500' :
                  state === 'uploading' ? 'bg-primary animate-pulse' :
                  'bg-muted-foreground/30'
                }`} />
                <span className="text-xs font-mono uppercase tracking-wider">
                  {state === 'idle' && 'READY'}
                  {state === 'parsing' && 'PARSING'}
                  {state === 'validating' && 'VALIDATING'}
                  {state === 'uploading' && 'PROCESSING'}
                  {state === 'success' && 'COMPLETE'}
                  {state === 'error' && 'ERROR'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Instructions & Upload */}
            <div className="lg:col-span-1 space-y-6">
              {/* Instructions */}
              <Card className="border-primary/20 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-mono font-bold uppercase text-sm tracking-wider">
                      IMPORT PROTOCOL
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {[
                      { num: '01', text: 'Download CSV template' },
                      { num: '02', text: 'Fill in asset data' },
                      { num: '03', text: 'Upload completed file' },
                      { num: '04', text: 'Review validation results' },
                      { num: '05', text: 'Confirm mass import' },
                    ].map((step) => (
                      <div key={step.num} className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {step.num}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground">
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="w-full font-mono text-xs"
                      onClick={() => downloadCSVTemplate()}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      DOWNLOAD TEMPLATE
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="border-border bg-card">
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">
                    FILE REQUIREMENTS
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Format: CSV (.csv)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>No size limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Required: 12 columns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Arrays: Semicolon-separated</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Panel */}
              {parsedRows.length > 0 && (
                <Card className="border-border bg-card">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">
                      FILE STATISTICS
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-muted-foreground">Total Rows:</span>
                        <span className="font-bold">{parsedRows.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-muted-foreground">File Size:</span>
                        <span className="font-bold">{(file?.size || 0 / 1024).toFixed(2)} KB</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={validationErrors.length > 0 ? "destructive" : "default"} className="font-mono text-[10px]">
                          {validationErrors.length > 0 ? `${validationErrors.length} ERRORS` : 'READY'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Upload Zone & Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Zone */}
              {state !== 'success' && (
                <Card className="border-border bg-card">
                  <CardContent className="p-8">
                    {!file ? (
                      <div
                        className="border-2 border-dashed border-primary/30 rounded-xl p-12 hover:border-primary/60 transition-colors cursor-pointer bg-muted/20"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const droppedFile = e.dataTransfer.files[0];
                          if (droppedFile) handleFileSelect(droppedFile);
                        }}
                        onClick={() => document.getElementById('csv-file-input')?.click()}
                      >
                        <input
                          id="csv-file-input"
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) handleFileSelect(selectedFile);
                          }}
                          className="hidden"
                        />

                        <div className="flex flex-col items-center text-center space-y-4">
                          {state === 'parsing' ? (
                            <>
                              <Loader2 className="h-16 w-16 text-primary animate-spin" />
                              <div>
                                <p className="text-lg font-mono font-bold uppercase tracking-wider">
                                  PARSING CSV FILE
                                </p>
                                <p className="text-sm font-mono text-muted-foreground mt-1">
                                  Processing data format...
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="relative">
                                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                  <Upload className="h-10 w-10 text-primary" />
                                </div>
                                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                  <FileText className="h-3 w-3 text-primary" />
                                </div>
                              </div>
                              <div>
                                <p className="text-lg font-mono font-bold uppercase tracking-wider">
                                  DROP CSV FILE HERE
                                </p>
                                <p className="text-sm font-mono text-muted-foreground mt-2">
                                  or click to browse files
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                  <span>.CSV format only</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                  <span>No size limit</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* File Info */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                              <FileCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-mono font-semibold text-sm">{file.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {parsedRows.length} rows · {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={state === 'uploading'}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Preview Table */}
                        {parsedRows.length > 0 && validationErrors.length === 0 && (
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 border-b border-border">
                              <p className="text-xs font-mono font-bold uppercase tracking-wider">
                                DATA PREVIEW ({parsedRows.length} rows)
                              </p>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                              <table className="w-full text-xs font-mono">
                                <thead className="bg-muted/30 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-bold uppercase">#</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase">Name</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase">Category</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase">Tracking</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase">Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedRows.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="border-t border-border hover:bg-muted/20">
                                      <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                                      <td className="px-3 py-2">{row.name}</td>
                                      <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-[10px]">
                                          {row.trackingMethod}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">{row.totalQuantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {parsedRows.length > 10 && (
                              <div className="bg-muted/30 px-4 py-2 border-t border-border text-center">
                                <p className="text-xs font-mono text-muted-foreground">
                                  + {parsedRows.length - 10} more rows
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {parsedRows.length > 0 && validationErrors.length === 0 && state !== 'uploading' && (
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={handleReset}
                              className="flex-1 font-mono"
                            >
                              CANCEL
                            </Button>
                            <Button
                              onClick={handleUpload}
                              disabled={state === 'uploading'}
                              className="flex-1 font-mono uppercase tracking-wider"
                            >
                              {state === 'uploading' ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  IMPORTING {parsedRows.length} ASSETS
                                </>
                              ) : (
                                <>
                                  <Database className="w-4 h-4 mr-2" />
                                  IMPORT {parsedRows.length} ASSETS
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Card className="border-red-500/30 bg-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <h2 className="font-mono font-bold uppercase text-sm tracking-wider text-red-500">
                        VALIDATION FAILED
                      </h2>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <p className="text-sm font-mono text-red-600 font-semibold">
                        {validationErrors.length} row(s) contain errors
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        All-or-nothing mode: Fix all errors to proceed
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {validationErrors.map((error) => (
                        <div
                          key={error.row}
                          className="border border-red-500/20 rounded-lg p-3 bg-red-500/5"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive" className="font-mono text-[10px]">
                              ROW {error.row}
                            </Badge>
                            <span className="text-xs font-mono text-red-600 font-semibold">
                              {error.errors.length} error(s)
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {error.errors.map((err, idx) => (
                              <li key={idx} className="text-xs font-mono text-red-600 flex items-start gap-2">
                                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{err}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 font-mono text-xs"
                      >
                        UPLOAD NEW FILE
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success State */}
              {state === 'success' && uploadResult && (
                <Card className="border-emerald-500/30 bg-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <h2 className="font-mono font-bold uppercase text-sm tracking-wider text-emerald-500">
                        IMPORT COMPLETE
                      </h2>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                      <p className="text-2xl font-mono font-bold text-emerald-600">
                        {uploadResult.created}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        assets created successfully
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        QR CODES GENERATED
                      </p>
                      {uploadResult.assets.slice(0, 5).map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-2 bg-muted/20 rounded border border-border"
                        >
                          <span className="text-xs font-mono truncate">{asset.name}</span>
                          <span className="text-xs font-mono text-primary">{asset.qrCode}</span>
                        </div>
                      ))}
                      {uploadResult.assets.length > 5 && (
                        <p className="text-xs font-mono text-muted-foreground text-center py-2">
                          + {uploadResult.assets.length - 5} more
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 font-mono text-xs"
                      >
                        IMPORT MORE
                      </Button>
                      <Button
                        onClick={() => router.push('/admin/assets')}
                        className="flex-1 font-mono text-xs"
                      >
                        VIEW ASSETS
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
