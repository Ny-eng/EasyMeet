import { EventForm } from "@/components/EventForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleAd } from "@/components/GoogleAd";

export default function CreateEvent() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        {/* フォーム上部の広告 */}
        <div className="mb-6">
          <GoogleAd slot="create-event-top" style={{ minHeight: '120px' }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm />
          </CardContent>
        </Card>

        {/* フォーム下部の広告 */}
        <div className="mt-6">
          <GoogleAd slot="create-event-bottom" style={{ minHeight: '120px' }} />
        </div>
      </div>
    </div>
  );
}