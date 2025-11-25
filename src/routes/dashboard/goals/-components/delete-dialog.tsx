import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  openId: number | null
  onOpenChange: (id: number | null) => void
  onConfirm: (id: number) => void
  pending?: boolean
}

export function DeleteGoalDialog({ openId, onOpenChange, onConfirm, pending }: Props) {
  const open = !!openId
  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v ? openId : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir meta</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(null)} disabled={!!pending}>Cancelar</Button>
          <Button variant={'destructive'} onClick={() => openId && onConfirm(openId)} disabled={!!pending}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}