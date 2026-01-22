'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useCompleteReskinRequest } from '@/hooks/use-reskin-requests'
import { Upload } from 'lucide-react'

interface CompleteFabricationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reskinId: string
  originalAssetName: string
  targetBrandName: string
}

export function CompleteFabricationModal({
  open,
  onOpenChange,
  reskinId,
  originalAssetName,
  targetBrandName,
}: CompleteFabricationModalProps) {
  const completeReskin = useCompleteReskinRequest()
  const [newAssetName, setNewAssetName] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState('')

  const handleAddPhoto = () => {
    if (!photoInput.trim()) return
    setPhotos([...photos, photoInput.trim()])
    setPhotoInput('')
  }

  const handleComplete = async () => {
    if (!newAssetName.trim()) {
      toast.error('Please enter new asset name')
      return
    }

    if (photos.length === 0) {
      toast.error('Please add at least one photo')
      return
    }

    try {
      await completeReskin.mutateAsync({
        reskinId,
        data: {
          newAssetName: newAssetName.trim(),
          completionPhotos: photos,
          completionNotes: completionNotes || undefined,
        },
      })
      toast.success('Fabrication complete! New asset created.')
      onOpenChange(false)
      setNewAssetName('')
      setPhotos([])
      setCompletionNotes('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete fabrication')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Fabrication</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Original Asset:</span>{' '}
              <span className="font-semibold">{originalAssetName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Target Brand:</span>{' '}
              <span className="font-semibold">{targetBrandName}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="newAssetName">
              New Asset Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newAssetName"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="e.g., Red Bull Throne Chair"
            />
          </div>

          <div>
            <Label>
              Photos of Completed Asset <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="Photo URL"
                />
                <Button type="button" onClick={handleAddPhoto} variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {photos.length > 0 && (
                <div className="space-y-1">
                  {photos.map((photo, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                      <span className="flex-1 truncate">{photo}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">At least 1 photo required</p>
            </div>
          </div>

          <div>
            <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
            <Textarea
              id="completionNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g., Completed by ABC Fabricators on Jan 20"
              rows={3}
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-1">
              ⚠️ This will:
            </p>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 ml-4 list-disc">
              <li>Create new asset "{newAssetName || '...'}"</li>
              <li>Mark "{originalAssetName}" as TRANSFORMED</li>
              <li>Update order to use new asset</li>
              <li>Move order to IN_PREPARATION if all reskins complete</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={completeReskin.isPending}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={completeReskin.isPending}>
            {completeReskin.isPending ? 'Completing...' : 'Complete Fabrication'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
