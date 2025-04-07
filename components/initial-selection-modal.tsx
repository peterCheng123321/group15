"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Loader2 } from "lucide-react"
import type { Major } from "@/lib/types"

interface InitialSelectionModalProps {
  majors: Major[]
  isDataReady: boolean
  onConfirm: (major: string, year: string) => void
}

export function InitialSelectionModal({ majors, isDataReady, onConfirm }: InitialSelectionModalProps) {
  const [selectedMajor, setSelectedMajor] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>("Freshman")

  const handleConfirm = () => {
    if (selectedMajor && selectedYear) {
      onConfirm(selectedMajor, selectedYear)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Select Your Major and Year
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {!isDataReady ? (
            <div className="flex items-center gap-2 text-muted-foreground italic mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading majors...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mb-4">Please select your major and year to continue.</div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="major-select" className="text-sm font-medium">
                Major:
              </label>
              <Select disabled={!isDataReady} value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger id="major-select">
                  <SelectValue placeholder="Select a major" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((major) => (
                    <SelectItem key={major.id} value={major.id}>
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="year-select" className="text-sm font-medium">
                Year:
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freshman">Freshman</SelectItem>
                  <SelectItem value="Sophomore">Sophomore</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!isDataReady || !selectedMajor || !selectedYear} className="w-full">
            <GraduationCap className="h-4 w-4 mr-2" />
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
