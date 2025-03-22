import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DateGrid } from "./DateGrid";
import { ResponseInput } from "./ResponseInput";
import { apiRequest } from "@/lib/queryClient";
import { insertResponseSchema, type Event, type Response } from "@shared/schema";
import { AlertCircle } from "lucide-react";
import * as z from "zod";
import { useLocation, useSearch } from "wouter";
import { supabase, isSupabaseConfigured, supabaseApiRequest, createResponseDirectlyWithSupabase } from "@/lib/supabase";

interface ResponseFormProps {
  event: Event;
  responses: Response[];
  isPastDeadline: boolean;
}

const responseFormSchema = insertResponseSchema.omit({ eventId: true }).extend({
  name: z.string().min(1, "Name is required"),
});

export function ResponseForm({ event, responses, isPastDeadline }: ResponseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const editId = searchParams.get("edit");
  const editName = searchParams.get("name");
  const isEditMode = !!editId;

  // 既存の回答を検索
  const existingResponse = responses.find(r => r.id.toString() === editId);

  const [availability, setAvailability] = useState<boolean[]>(
    isEditMode && existingResponse
      ? existingResponse.availability
      : new Array(event.dates.length).fill(false)
  );

  const form = useForm({
    resolver: zodResolver(responseFormSchema),
    defaultValues: {
      name: isEditMode ? decodeURIComponent(editName || "") : "",
      availability: availability,
    },
  });

  useEffect(() => {
    if (isEditMode && existingResponse) {
      setAvailability(existingResponse.availability);
      form.setValue("availability", existingResponse.availability);
    }
  }, [isEditMode, existingResponse]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("回答提出データ:", data);
        console.log("環境変数チェック - VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL ? "設定あり" : "設定なし");
        
        // Vercel環境での環境変数対応
        const hasSupabaseConfig = 
          !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL) && 
          !!(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY);
        
        // Vercel環境かどうかを判定
        const isVercelEnv = typeof window !== 'undefined' && 
                          (window.location.hostname.includes('vercel.app') || 
                           window.location.hostname.includes('.replit.app') ||
                           window.location.hostname === 'localhost');
                           
        console.log("Vercel環境判定:", isVercelEnv ? "Vercel環境" : "ローカル環境");
        
        // Supabase APIが設定されている場合はそれを使用
        if (hasSupabaseConfig) {
          try {
            console.log("Supabase APIを使用して回答を作成します");
            console.log("Supabase設定状態:", isSupabaseConfigured ? "設定済み" : "未設定");
            
            // Vercel環境または明示的に指定された場合は直接Supabaseを使用
            if (isVercelEnv || import.meta.env.VITE_USE_DIRECT_SUPABASE === 'true') {
              try {
                console.log("createResponseDirectlyWithSupabase関数を使用して回答を作成します");
                const response = await createResponseDirectlyWithSupabase({
                  name: data.name,
                  eventId: event.id,
                  availability: data.availability
                });
                
                console.log("createResponseDirectlyWithSupabaseの結果:", response);
                return response;
              } catch (directError) {
                console.error("createResponseDirectlyWithSupabase使用エラー:", directError);
                throw directError;
              }
            }
            
            // ローカル開発環境ではsupabaseApiRequestを使用
            console.log("supabaseApiRequestを使用して回答を作成します");
            const result = await supabaseApiRequest(`/api/events/${event.slug}/responses`, {
              method: "POST",
              body: JSON.stringify({
                name: data.name,
                eventId: event.id,
                availability: data.availability
              })
            });
            console.log("supabaseApiRequestの結果:", result);
            return result;
          } catch (error) {
            console.error("Error submitting response with Supabase:", error);
            console.log("Supabaseでエラーが発生しました。ローカルAPIにフォールバックします");
            // Supabaseでエラーが発生した場合、ローカルAPIにフォールバック
          }
        } else {
          console.log("Supabase設定が見つかりません。ローカルAPIを使用します");
        }
        
        // ローカルAPIを使用
        try {
          console.log("ローカルAPIを使用して回答を作成します");
          const res = await apiRequest("POST", `/api/events/${event.slug}/responses`, data);
          const responseData = await res.json();
          console.log("ローカルAPIの結果:", responseData);
          return responseData;
        } catch (error) {
          console.error("Error submitting response with local API:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error submitting response:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Response Updated" : "Response Submitted",
        description: isEditMode ? "Your availability has been updated." : "Your response has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.slug] });
      form.reset();
      setAvailability(new Array(event.dates.length).fill(false));
      // If in edit mode, return to normal view
      if (isEditMode) {
        setLocation(`/event/${event.slug}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleAvailability = (index: number) => {
    const newAvailability = [...availability];
    newAvailability[index] = !newAvailability[index];
    setAvailability(newAvailability);
    form.setValue("availability", newAvailability);
  };

  if (isPastDeadline) {
    return (
      <div className="space-y-6">
        <DateGrid event={event} responses={responses} />
        <div className="bg-secondary/20 p-4 rounded-lg text-center text-muted-foreground">
          Response deadline has passed. No new responses can be submitted.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Current Responses Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Current Responses</h2>
        <DateGrid event={event} responses={responses} />
      </div>

      {/* Submit Response Section - Now with more visual separation */}
      <div className="bg-secondary/5 rounded-xl p-8 border">
        <h2 className="text-lg font-semibold mb-6">
          {isEditMode ? "Edit Response" : "Submit Your Response"}
        </h2>
        <div className="mb-6 bg-secondary/10 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-primary shrink-0" />
            <div className="space-y-2">
              {isEditMode ? (
                <p className="text-sm text-muted-foreground">
                  You can modify your availability below. Click Save Changes when done.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    1. Enter your name below
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Click on each date option to mark your availability
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Submit your response when ready
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="bg-secondary/10 rounded-lg p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-background" disabled={isEditMode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Your Availability</FormLabel>
                <ResponseInput
                  event={event}
                  availability={availability}
                  onToggle={toggleAvailability}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 h-14 text-lg font-medium bg-gradient-to-r from-primary to-primary hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02]"
                  disabled={mutation.isPending}
                >
                  {isEditMode ? "Save Changes" : "Submit Response"}
                </Button>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={() => setLocation(`/event/${event.slug}`)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}