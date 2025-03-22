import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ResponseForm } from "@/components/ResponseForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Edit2, Calendar as CalendarIcon, Copy, Check, Share2, FileDown, ChevronDown, ChevronUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GoogleAd } from "@/components/GoogleAd";
import { exportToCSV } from "@/lib/csvExport";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isSupabaseConfigured, getEventDirectlyFromSupabase, supabaseApiRequest, supabase, updateEventDirectlyWithSupabase } from "@/lib/supabase";

export default function Event() {
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);  // Changed from true to false

  const { data, isLoading } = useQuery({
    queryKey: ["/api/events", slug],
    queryFn: async () => {
      console.log("イベント情報を取得しています - スラッグ:", slug);
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
          console.log("Supabase APIを使用してイベント情報を取得します");
          console.log("Supabase設定状態:", isSupabaseConfigured ? "設定済み" : "未設定");
          
          // Vercel環境または明示的に指定された場合は直接Supabaseを使用
          if ((isVercelEnv || import.meta.env.VITE_USE_DIRECT_SUPABASE === 'true') && slug) {
            try {
              console.log("getEventDirectlyFromSupabase関数を使用してイベント情報を取得します");
              const result = await getEventDirectlyFromSupabase(slug);
              console.log("getEventDirectlyFromSupabaseの結果:", result);
              return result;
            } catch (directError) {
              console.error("getEventDirectlyFromSupabase使用エラー:", directError);
              // エラーが発生した場合でも再スローせず、次の方法を試みる
            }
          }
          
          // 直接取得に失敗した場合、APIを経由して取得を試みる
          try {
            console.log("supabaseApiRequestを使用してイベント情報を取得します");
            const result = await supabaseApiRequest(`/api/events/${slug}`);
            console.log("supabaseApiRequestの結果:", result);
            return result;
          } catch (apiError) {
            console.error("Error fetching from Supabase API:", apiError);
            // Supabase APIでもエラーが発生した場合、ローカルAPIにフォールバック
          }
        } catch (error) {
          console.error("Error using Supabase:", error);
          // Supabaseでエラーが発生した場合、ローカルAPIにフォールバック
        }
      } else {
        console.log("Supabase設定が見つかりません。ローカルAPIを使用します");
      }
      
      // ローカルAPIを使用（最後の手段）
      try {
        console.log("ローカルAPIを使用してイベント情報を取得します");
        const response = await fetch(`/api/events/${slug}`);
        if (!response.ok) {
          throw new Error(`Error fetching event: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("ローカルAPIの結果:", data);
        return data;
      } catch (error) {
        console.error("Error fetching from local API:", error);
        throw error;
      }
    },
  });

  const startEditing = () => {
    if (data?.event) {
      setEditedTitle(data.event.title);
      setEditedDescription(data.event.description || "");
      setIsEditing(true);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updateData: { title: string; description: string; deadline: string }) => {
      console.log("イベント更新データ:", updateData);
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
          console.log("Supabase APIを使用してイベントを更新します");
          
          // Vercel環境または明示的に指定された場合は直接Supabaseを使用
          if ((isVercelEnv || import.meta.env.VITE_USE_DIRECT_SUPABASE === 'true') && slug) {
            try {
              console.log("updateEventDirectlyWithSupabase関数を使用してイベントを更新します");
              const updatedEvent = await updateEventDirectlyWithSupabase(slug, {
                title: updateData.title,
                description: updateData.description,
                deadline: updateData.deadline
              });
              
              console.log("updateEventDirectlyWithSupabaseの結果:", updatedEvent);
              return updatedEvent;
            } catch (directError) {
              console.error("updateEventDirectlyWithSupabase使用エラー:", directError);
              // エラーが発生した場合も次の方法を試す
            }
          }
          
          // ローカル開発環境またはVercel環境でもsupabaseApiRequestを使用
          try {
            console.log("supabaseApiRequestを使用してイベントを更新します");
            const result = await supabaseApiRequest(`/api/events/${slug}`, {
              method: "PATCH",
              body: JSON.stringify(updateData)
            });
            console.log("supabaseApiRequestの結果:", result);
            return result;
          } catch (apiError) {
            console.error("Error updating with Supabase API:", apiError);
            // Supabase APIでもエラーが発生した場合、ローカルAPIにフォールバック
          }
        } catch (error) {
          console.error("Error updating with Supabase:", error);
          // Supabaseでエラーが発生した場合、ローカルAPIにフォールバック
        }
      } else {
        console.log("Supabase設定が見つかりません。ローカルAPIを使用します");
      }
      
      // ローカルAPIを使用（最後の手段）
      try {
        console.log("ローカルAPIを使用してイベントを更新します");
        const res = await apiRequest("PATCH", `/api/events/${slug}`, updateData);
        const data = await res.json();
        console.log("ローカルAPIの結果:", data);
        return data;
      } catch (error) {
        console.error("Error updating with local API:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", slug] });
      setIsEditing(false);
      toast({
        title: "Event updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyEventLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    toast({
      title: "Link copied",
      description: "Event link has been copied to clipboard.",
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // データが取得できなかった場合のエラーハンドリング
  if (!data || !data.event) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>エラー</CardTitle>
            <CardDescription>イベント情報の取得に失敗しました。</CardDescription>
          </CardHeader>
          <CardContent>
            <p>イベントが見つからないか、データの取得中にエラーが発生しました。</p>
            <Button className="mt-4" onClick={() => window.location.href = "/"}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, responses } = data;
  
  // deadline値が存在しない場合のフォールバック
  const deadlineDate = event.deadline ? new Date(event.deadline) : new Date();
  const isPastDeadline = new Date() > deadlineDate;

  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <GoogleAd slot="event-page-top" style={{ minHeight: '120px' }} />
        </div>
        <Card>
          <CardHeader>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-xl font-semibold"
                />
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Event description"
                  className="resize-none"
                />
                <div className="rounded-md border">
                  {/* Calendar component with proper type handling */}
                  <Calendar
                    mode="single"
                    selected={new Date(event.deadline)}
                    onSelect={(date) => {
                      if (date instanceof Date) {
                        updateMutation.mutate({
                          title: editedTitle,
                          description: editedDescription,
                          deadline: date.toISOString()
                        });
                      }
                    }}
                    disabled={(date: Date) => date < new Date()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateMutation.mutate({
                      title: editedTitle,
                      description: editedDescription,
                      deadline: new Date(event.deadline).toISOString()
                    })}
                    disabled={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <CardTitle>{event.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyEventLink}
                      className="h-8 w-8 p-0"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditing}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>Organized by {event.organizer}</CardDescription>
                {event.description && (
                  <p className="mt-2 text-muted-foreground">{event.description}</p>
                )}
              </>
            )}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  Response deadline: {format(deadlineDate, "MMM d, yyyy")}
                  {isPastDeadline && " (Expired)"}
                </span>
              </div>
              <Collapsible
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                className="mt-6"
              >
                <div className="bg-secondary/20 rounded-lg p-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Share2 className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <h3 className="font-medium">Share this event</h3>
                          <p className="text-sm text-muted-foreground">
                            Copy and share this link with participants
                          </p>
                        </div>
                      </div>
                      {isShareOpen ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyEventLink}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02] text-white hover:text-white border-0"
                      >
                        {isCopied ? "Link Copied!" : "Copy Event Link"}
                        {isCopied ? <Check className="ml-2 h-4 w-4" /> : <Copy className="ml-2 h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(event, responses)}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02] text-white hover:text-white border-0"
                      >
                        Download CSV
                        <FileDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
              {responses.length === 0 && (
                <p className="mt-4 text-center text-muted-foreground">
                  No responses yet.
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponseForm event={event} responses={responses} isPastDeadline={isPastDeadline} />
            <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Note: All event data and responses will be automatically deleted one week after the last proposed date.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="my-8">
          <GoogleAd slot="event-page-middle" style={{ minHeight: '120px' }} />
        </div>
        <div className="mt-8">
          <GoogleAd slot="event-page-bottom" style={{ minHeight: '120px' }} />
        </div>
      </div>
    </div>
  );
}