import {
  CircleAlertIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileJsonIcon,
  TriangleAlertIcon,
  UploadIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from '#/components/ui/dialog'
import {
  FileUpload,
  FileUploadDescription,
  FileUploadDropzone,
  FileUploadDropzoneIcon,
  FileUploadTitle,
} from '#/components/ui/file-upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useVault } from '#/context/VaultContext'
import type { DecryptedItem } from '#/types/vault'
import { parseImportFile } from './import-parsers'
import { downloadJson, todayStamp } from './utils'

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'export' | 'import'
}

type Status = { type: 'success' | 'error'; message: string } | null

export function ImportExportDialog({
  open,
  onOpenChange,
  defaultTab = 'export',
}: ImportExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      <DialogContent size="md">
        <DialogHeader
          title="Import & export"
          description="Back up your vault or bring passwords over from another manager."
        />
        <DialogBody>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full">
              <TabsTrigger value="export" className="flex-1">
                <DownloadIcon />
                Export
              </TabsTrigger>
              <TabsTrigger value="import" className="flex-1">
                <UploadIcon />
                Import
              </TabsTrigger>
            </TabsList>
            <TabsContent value="export" className="pt-4">
              <ExportPanel />
            </TabsContent>
            <TabsContent value="import" className="pt-4">
              <ImportPanel open={open} />
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function ExportPanel() {
  const { exportDecryptedJSON, items } = useVault()

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <TriangleAlertIcon />
        <AlertTitle>This file is not encrypted</AlertTitle>
        <AlertDescription>
          It contains every password, note and 2FA secret in plain text. Store
          it somewhere safe and delete it when you're done.
        </AlertDescription>
      </Alert>
      <Button
        className="w-full"
        onClick={() =>
          downloadJson(
            exportDecryptedJSON(),
            `onevault-export-${todayStamp()}.json`,
          )
        }
        size="lg"
      >
        <FileJsonIcon />
        Download {items.length} {items.length === 1 ? 'item' : 'items'} as JSON
      </Button>
    </div>
  )
}

function ImportPanel({ open }: { open: boolean }) {
  const { importBatch } = useVault()
  const [parsed, setParsed] = useState<Partial<DecryptedItem>[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Start fresh every time the dialog is reopened
  useEffect(() => {
    if (!open) {
      setParsed([])
      setFileName(null)
      setStatus(null)
    }
  }, [open])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setStatus(null)
    setFileName(file.name)
    try {
      setParsed(await parseImportFile(file))
    } catch (error) {
      setParsed([])
      setStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Could not read this file.',
      })
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setStatus(null)
    try {
      const count = await importBatch(parsed)
      setStatus({
        type: 'success',
        message: `Encrypted and imported ${count} ${count === 1 ? 'item' : 'items'}.`,
      })
      setParsed([])
      setFileName(null)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FileUpload
        maxFiles={1}
        onFileAccept={({ files }) => handleFile(files[0])}
      >
        <FileUploadDropzone>
          <FileUploadDropzoneIcon />
          <FileUploadTitle>
            {fileName ?? 'Drop a file here or click to browse'}
          </FileUploadTitle>
          <FileUploadDescription className="font-normal text-xs">
            CSV from 1Password, Bitwarden, LastPass or Chrome, or a OneVault
            JSON backup
          </FileUploadDescription>
        </FileUploadDropzone>
      </FileUpload>

      {status && (
        <Alert variant={status.type === 'success' ? 'success' : 'destructive'}>
          {status.type === 'success' ? (
            <CircleCheckIcon />
          ) : (
            <CircleAlertIcon />
          )}
          <AlertDescription className="text-foreground">
            {status.message}
          </AlertDescription>
        </Alert>
      )}

      {parsed.length > 0 && (
        <Button
          className="w-full"
          isLoading={isImporting}
          onClick={handleImport}
          size="lg"
        >
          <UploadIcon />
          Import {parsed.length} {parsed.length === 1 ? 'item' : 'items'}
        </Button>
      )}
    </div>
  )
}
