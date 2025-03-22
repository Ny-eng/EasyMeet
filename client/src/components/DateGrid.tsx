import { Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { type Event, type Response } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

interface DateGridProps {
  event: Event;
  responses: Response[];
}

export function DateGrid({ event, responses }: DateGridProps) {
  const [, setLocation] = useLocation();
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return {
      date: format(d, "MM/dd"),
      time: format(d, "HH:mm")
    };
  };

  // Sort dates in chronological order
  const sortedDates = [...event.dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Calculate total availability for each date
  const totals = sortedDates.map((_, dateIndex) => {
    return responses.reduce((sum, response) => {
      return sum + (response.availability[dateIndex] ? 1 : 0);
    }, 0);
  });

  // Find the date(s) with maximum availability
  const maxAvailable = Math.max(...totals);
  const bestDates = totals.map((total) => total === maxAvailable);

  const handleRowClick = (response: Response) => {
    setSelectedResponse(response);
  };

  const handleConfirm = () => {
    if (selectedResponse) {
      // Edit mode URL
      setLocation(`/event/${event.slug}?edit=${selectedResponse.id}&name=${encodeURIComponent(selectedResponse.name)}`);
    }
    setSelectedResponse(null);
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-secondary/10 rounded-lg">
        No responses yet. Be the first to submit your availability!
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <ScrollArea className="w-full" style={{ maxHeight: `${Math.min(500, Math.max(200, responses.length * 50 + 100))}px` }}>
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background border-r w-[120px]">
                  Name
                </TableHead>
                {sortedDates.map((date, i) => {
                  const formattedDate = formatDate(date);
                  return (
                    <TableHead 
                      key={i} 
                      className={`min-w-[100px] text-center ${bestDates[i] ? "bg-secondary/20" : ""}`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{formattedDate.date}</div>
                        <div className="text-sm text-muted-foreground">{formattedDate.time}</div>
                        <Progress
                          value={(totals[i] / Math.max(responses.length, 1)) * 100}
                          className="h-1.5"
                        />
                        <div className="text-xs">
                          {totals[i]}/{responses.length}
                        </div>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow 
                  key={response.id}
                  className="cursor-pointer hover:bg-secondary/5"
                  onClick={() => handleRowClick(response)}
                >
                  <TableCell className="sticky left-0 bg-background border-r font-medium">
                    {response.name}
                  </TableCell>
                  {sortedDates.map((_, i) => (
                    <TableCell key={i} className={`text-center ${bestDates[i] ? "bg-secondary/10" : ""}`}>
                      {response.availability[i] ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <AlertDialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Response Edit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you {selectedResponse?.name}? If you want to modify your response, click "Edit Response".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setSelectedResponse(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Edit Response
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}