'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Upload, 
  MessageSquare, 
  FileJson, 
  Eye, 
  Users, 
  CheckCircle2,
  ArrowRight,
  Layers,
  Target,
  BarChart3,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/projects');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                <Eye className="w-5 h-5 text-background" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">DesignSight</span>
                <span className="ml-2 text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-md">AI-Powered</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>
                Sign In
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants(), "font-medium")}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-36 lg:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Powered by Google Gemini
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Design Feedback,
              <br />
              <span className="text-muted-foreground">Reimagined with AI</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Get instant, intelligent feedback on your designs with visual overlays, 
              role-based insights, and collaborative tools—all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "text-base font-medium")}>
                Start Analyzing Designs
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link href="/sign-in" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "text-base font-medium")}>
                See How It Works
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto pt-8 border-t">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-1">5 min</div>
              <div className="text-sm text-muted-foreground">Analysis time</div>
            </div>
            <div className="text-center border-x">
              <div className="text-2xl sm:text-3xl font-bold mb-1">95%</div>
              <div className="text-sm text-muted-foreground">Accuracy rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-1">∞</div>
              <div className="text-sm text-muted-foreground">Uploads</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20 sm:py-28 bg-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Built for Design Teams
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to streamline design reviews and collaboration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">Visual Overlays</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                See feedback directly on your designs with interactive bounding boxes and precise positioning
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">AI Analysis</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Automatically detect accessibility issues, visual hierarchy problems, and UI inconsistencies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">Role-Based Views</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Filter feedback by Designer, Reviewer, PM, or Developer perspectives for relevant insights
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">Team Comments</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Collaborate with your team through organized, context-aware discussions on each feedback item
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <FileJson className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">Export Reports</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Generate comprehensive feedback reports in JSON or beautifully formatted PDF documents
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 transition-all hover:shadow-lg hover:border-foreground/20">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-background" />
              </div>
              <CardTitle className="text-xl">Project Management</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Organize designs into projects and track analysis status with real-time processing updates
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Three Simple Steps
            </h2>
            <p className="text-lg text-muted-foreground">
              From upload to insights in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl border-2 border-foreground flex items-center justify-center mb-6 text-2xl font-bold">
                01
              </div>
              <h3 className="text-2xl font-bold mb-3">Upload</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Drag and drop your design files or paste image URLs. Supports PNG, JPG, and SVG formats.
              </p>
            </div>

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl border-2 border-foreground flex items-center justify-center mb-6 text-2xl font-bold">
                02
              </div>
              <h3 className="text-2xl font-bold mb-3">Analyze</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Our AI instantly scans your design for issues and generates detailed feedback with visual markers.
              </p>
            </div>

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl border-2 border-foreground flex items-center justify-center mb-6 text-2xl font-bold">
                03
              </div>
              <h3 className="text-2xl font-bold mb-3">Collaborate</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Review feedback, add comments, and export professional reports for your team and stakeholders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20 sm:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 tracking-tight">
                Why Design Teams Choose Us
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 mt-1" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Faster Reviews</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Cut design review time by 70% with instant AI-powered feedback that catches issues early.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 mt-1" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Better Quality</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Identify accessibility and usability problems before they reach development or production.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 mt-1" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Seamless Collaboration</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Keep all feedback, discussions, and iterations organized in one central platform.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 mt-1" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Professional Reports</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Generate comprehensive reports in JSON or PDF to share with clients and stakeholders.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-background" />
                  </div>
                  <div className="text-3xl font-bold mb-1">Fast</div>
                  <p className="text-sm text-muted-foreground">5 minute average analysis</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5 text-background" />
                  </div>
                  <div className="text-3xl font-bold mb-1">Accurate</div>
                  <p className="text-sm text-muted-foreground">95% detection rate</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-4">
                    <Upload className="w-5 h-5 text-background" />
                  </div>
                  <div className="text-3xl font-bold mb-1">Unlimited</div>
                  <p className="text-sm text-muted-foreground">No upload restrictions</p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-background" />
                  </div>
                  <div className="text-3xl font-bold mb-1">Smart</div>
                  <p className="text-sm text-muted-foreground">AI-powered insights</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-foreground">
            <CardContent className="p-12 sm:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                Ready to Elevate Your Design Process?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join design teams who are shipping better products with AI-powered feedback
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "text-base font-medium")}>
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link href="/sign-in" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "text-base font-medium")}>
                  Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
                <Eye className="w-4 h-4 text-background" />
              </div>
              <span className="font-semibold text-lg">DesignSight</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 DesignSight. Empowering design teams with AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
