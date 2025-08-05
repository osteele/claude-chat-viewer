import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

interface ArtifactProps {
  title: string
  content: string
  identifier: string
  artifactType: string
  artifactNumber?: number
}

export function Artifact({ title, content, identifier: _identifier, artifactType: _artifactType, artifactNumber }: ArtifactProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="my-4 [print-color-adjust:exact]">
        <div
          className="flex rounded-lg border border-[#e8e7df] bg-[#f5f4ef] shadow-md cursor-pointer hover:bg-[#f5f4ee]"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center justify-center w-14 border-r bg-[#f0eee5] border-[#e8e7df]">
            <div className="text-sm text-gray-600 font-mono">&lt;/&gt;</div>
          </div>
          <div className="p-3">
            <div className="font-medium text-gray-900">{title}</div>
            <div className="text-sm text-gray-500 print:hidden">Click to open component</div>
            {artifactNumber && (
              <div className="text-sm text-gray-500 hidden print:block">Artifact {artifactNumber} (see appendix)</div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[600px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <pre className="p-4 rounded-lg bg-gray-50 overflow-x-auto">
              <code className="text-sm">{content}</code>
            </pre>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
