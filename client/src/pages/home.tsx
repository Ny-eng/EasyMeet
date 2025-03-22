import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAd } from "@/components/GoogleAd";

export default function Home() {
  const [, setLocation] = useLocation();
  const [eventTitle, setEventTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventTitle.trim()) {
      setLocation(`/create?title=${encodeURIComponent(eventTitle.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-6xl font-bold tracking-[0.05em] mb-6 text-primary">
            EasyMeet
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            No logins, no hassle. Just pick a time! 🥳
          </p>

          {/* メインコンテンツ間の動画 */}
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
            <video 
              className="w-full"
              autoPlay 
              loop 
              muted 
              playsInline
              controls={false}
            >
              <source src="/assets/movie.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              placeholder="Enter event name"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="text-lg h-14 px-6 border-0 bg-secondary/50 placeholder:text-muted-foreground/60"
            />
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-primary hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-[1.02]"
            >
              Create Event
            </Button>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>

          {/* 下部の広告 */}
          <div className="mt-12">
            <GoogleAd slot="home-page-bottom" style={{ minHeight: '120px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}