import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEventSchema } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import * as z from "zod";
import { X, Edit2, Calendar as CalendarIcon } from "lucide-react";

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export function EventForm() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);

  // TypeScriptエラーを回避するために型を明示的に定義
  type EventFormValues = {
    title: string;
    description: string;
    organizer: string;
    dates: Date[];
    time: string;
    deadline: Date;
  };

  const eventFormSchema = insertEventSchema.extend({
    deadline: z.date({
      required_error: "Response deadline is required",
    }),
  });

  // formの型を明示的に指定
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: new URLSearchParams(search).get("title") || "",
      description: "",
      organizer: "",
      dates: [] as Date[],
      time: "09:00",
      deadline: new Date(),
    },
  });

  const addDateTime = (date: Date) => {
    const [hours, minutes] = selectedTime.split(":");
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

    const currentDates = form.getValues("dates");
    const exists = currentDates.some(
      (d) => format(new Date(d), "yyyy-MM-dd HH:mm") === format(dateTime, "yyyy-MM-dd HH:mm")
    );

    if (!exists) {
      // 日時を追加して時系列順にソート
      const newDates = [...currentDates, dateTime].sort((a, b) => a.getTime() - b.getTime());
      form.setValue("dates", newDates);
    }
  };

  const removeDateTime = (index: number) => {
    const currentDates = form.getValues("dates");
    const newDates = [...currentDates];
    newDates.splice(index, 1);
    form.setValue("dates", newDates);
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const { time, ...eventData } = data;
        const payload = {
          ...eventData,
          time, // timeフィールドを含める
          dates: eventData.dates.map((d: Date) => d.toISOString()),
          deadline: eventData.deadline.toISOString(),
        };
        
        // Supabase APIが設定されている場合はそれを使用
        if (import.meta.env.VITE_SUPABASE_URL) {
          try {
            // supabaseApiRequest関数をインポート
            const { supabaseApiRequest } = await import("@/lib/supabase");
            return await supabaseApiRequest("/api/events", {
              method: "POST",
              body: JSON.stringify(payload)
            });
          } catch (error) {
            console.error("Error creating event with Supabase:", error);
            // Supabaseでエラーが発生した場合、ローカルAPIにフォールバック
          }
        }
        
        // ローカルAPIを使用
        try {
          const res = await apiRequest("POST", "/api/events", payload);
          return res.json();
        } catch (error) {
          console.error("Error creating event with local API:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
      console.log("Event created successfully, redirecting to:", data.slug);
      // 処理を少し遅らせてSupabaseのデータが確実に反映されるようにする
      setTimeout(() => {
        setLocation(`/event/${data.slug}`);
      }, 500);
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input {...field} className="text-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-[100px] resize-none" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Response Deadline <span className="text-red-500">*</span></FormLabel>
              <div className="space-y-2">
                {!showDeadlineCalendar ? (
                  <div
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg cursor-pointer"
                    onClick={() => setShowDeadlineCalendar(true)}
                  >
                    {field.value ? (
                      <span className="text-sm">{format(field.value, "MMM d, yyyy")}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Select a deadline</span>
                    )}
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-background">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setShowDeadlineCalendar(false);
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-md"
                    />
                  </div>
                )}
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Date and Time Options <span className="text-red-500">*</span></h3>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1. Select Time</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedTime(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2. Select Dates for {selectedTime}</FormLabel>
                    <div className="space-y-4">
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={(date) => date && addDateTime(date)}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                      {field.value.length > 0 && (
                        <div className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Selected Date/Time Options:</h4>
                          {[...field.value]
                            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                            .map((date, index) => (
                              <div key={index} className="flex items-center justify-between bg-background p-2 rounded">
                                <span className="text-sm">{format(new Date(date), "MMM d, yyyy 'at' HH:mm")}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDateTime(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-primary hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02]"
          disabled={mutation.isPending}
        >
          Create Event
        </Button>
      </form>
    </Form>
  );
}