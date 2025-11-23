'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Eye, Calendar } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerId: string;
}

interface Image {
  _id: string;
  projectId: string;
  filename: string;
  url: string;
  status: 'uploaded' | 'processing' | 'done' | 'failed';
  uploadedAt: string;
}

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentImages, setRecentImages] = useState<Image[]>([]);
  const [totalFeedbackItems, setTotalFeedbackItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchProjects();
      fetchDashboardStats();
    }
  }, [isLoaded, isSignedIn]);

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

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to DesignSight</CardTitle>
            <CardDescription>
              AI-powered design feedback and collaboration platform
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please sign in to access your projects and get AI-powered design feedback.
            </p>
            <Button asChild className="w-full">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setRecentImages(data.data.images || []);
        setTotalFeedbackItems(data.data.totalFeedbackItems || 0);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          ownerId: user?.id || 'anonymous'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProjects([data.data, ...projects]);
        setNewProjectName('');
        setNewProjectDescription('');
        setShowCreateProject(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
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
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <Link href="/" className="inline-block">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground hover:opacity-80 transition-opacity">DesignSight</h1>
              </Link>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                AI-powered design feedback and collaboration
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Button onClick={() => setShowCreateProject(true)} size="sm" className="sm:size-default">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Create Project Form */}
        {showCreateProject && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Create New Project</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Start a new design feedback project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createProject} className="space-y-3 sm:space-y-4">
                <div>
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto">Create Project</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateProject(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Your Projects</h2>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-3 sm:mb-4 px-4">
                  Create your first project to start getting AI-powered design feedback
                </p>
                <Button onClick={() => setShowCreateProject(true)} size="sm" className="sm:size-default">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {projects.map((project) => (
                <Link key={project._id} href={`/projects/${project._id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3 sm:pb-6">
                      <CardTitle className="line-clamp-1 text-sm sm:text-base">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Projects</CardTitle>
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Images Analyzed</CardTitle>
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{recentImages.length}</div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Feedback Items</CardTitle>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{totalFeedbackItems}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
