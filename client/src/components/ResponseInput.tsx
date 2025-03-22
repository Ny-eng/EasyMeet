import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ResponseInputProps {
  event: Event;
  availability: boolean[];
  onToggle: (index: number) => void;
}

export function ResponseInput({ event, availability, onToggle }: ResponseInputProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 text-green-500">
            <Check className="h-4 w-4" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 text-red-500">
            <X className="h-4 w-4" />
          </div>
          <span>Unavailable</span>
        </div>
      </div>

      <div className="grid gap-3">
        {event.dates.map((date, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-all hover:scale-[1.02] ${
              availability[index] 
                ? "bg-green-50/50 border-green-500 hover:border-green-600" 
                : "bg-red-50/50 border-red-500 hover:border-red-600"
            }`}
            onClick={() => onToggle(index)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm">{format(new Date(date), "MMM d, yyyy 'at' HH:mm")}</span>
              {availability[index] ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}