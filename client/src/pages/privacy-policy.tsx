import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header minimal />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>Last updated: {new Date().toLocaleDateString()}</p>

              <h2>1. Information We Collect</h2>
              <p>When you use EasyMeet, we collect the following information:</p>
              <ul>
                <li>Event details you provide (title, description, dates)</li>
                <li>Participant responses (name and availability)</li>
                <li>Basic device information for service optimization</li>
                <li>Access times and dates for security purposes</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We use the collected information for:</p>
              <ul>
                <li>Providing and maintaining the service</li>
                <li>Improving user experience</li>
                <li>Ensuring service security and reliability</li>
                <li>Analytics to enhance service functionality</li>
              </ul>

              <h2>3. Data Storage and Security</h2>
              <p>Event data and responses are stored temporarily and automatically deleted 14 days after the last proposed date for each event. We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
              
              <h2>4. International Data Transfer</h2>
              <p>Your information may be transferred to and processed in countries where data protection laws may differ from those in your country. By using our service, you consent to this transfer.</p>

              <h2>5. Cookies and Local Storage</h2>
              <p>We use cookies and local storage technologies to enhance your experience. These technologies help us remember your preferences and optimize our service. You can manage cookie preferences through your browser settings.</p>

              <h2>6. Third Party Services</h2>
              <p>We may use third-party services for analytics and functionality. These services may collect information sent by your device as part of their own privacy policies.</p>

              <h2>7. Your Rights</h2>
              <p>Depending on your location, you may have rights to access, correct, delete, or restrict the processing of your personal information. Contact us to exercise these rights.</p>

              <h2>8. Changes to Privacy Policy</h2>
              <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

              <h2>9. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us via the provided contact information on our website.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}