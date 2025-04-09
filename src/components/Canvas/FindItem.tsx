import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useCanvasStore } from "@/state/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CanvasItem } from "@/types"
import { debounce } from "lodash"

export function FindItemDialog({ open, onOpenChange, onHightlightItem }: any) {

  const { itemsMap } = useCanvasStore()

  const [value, setValue] = useState('')

  const lst = useMemo(() => [...itemsMap], [itemsMap])
  const filterResult = useMemo(() => {
    return lst.filter((item) => {
      if (value.length <= 2) {
        return false
      }
      const data = item[1];
      return (
        item[0].includes(value) ||
        data.equipId?.includes(value) ||
        data.locId?.includes(value) ||
        data.boxCode?.includes(value) ||
        data.boxName?.includes(value)
      );
    })
  }, [value, lst])

  const close = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  useEffect(() => {
    if (open) {
      setValue('')
    }
  }, [open])

  const highlightItem = useCallback((item: CanvasItem) => {
    onHightlightItem(item.objid)
    onOpenChange(false)
  }, [onHightlightItem, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>查找元素</DialogTitle>
          <DialogDescription>
            通过模糊查询查找指定的元素
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input value={value} onChange={e => setValue(e.target.value)} placeholder="在此输出模糊查询" className="col-span-3" />
        </div>
        {
          value.length <= 2 && <div className="h-72 w-full flex justify-center items-center">
            输入大于两个字符的内容开始查询
          </div>
        }
        {
          (value.length > 2 && filterResult.length === 0) && <div className="h-72 w-full flex justify-center items-center">
            暂无查询结构
          </div>
        }
        {
          filterResult.length !== 0 && <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-3">
              {filterResult.map((item) => (
                <div key={item[0]} onClick={() => highlightItem(item[1])}>
                  <div className="text-sm p-3 rounded hover:bg-zinc-400/30">
                    objid: {item[0]} <br />
                    equipId: {item[1].equipId} <br />
                    locId: {item[1].locId} <br />
                    boxCode: {item[1].boxCode} <br />
                    boxName: {item[1].boxName}
                  </div>
                  <Separator className="my-0.5" />
                </div>
              ))}
            </div>
          </ScrollArea>
        }

        <DialogFooter>
          <Button onClick={close}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
