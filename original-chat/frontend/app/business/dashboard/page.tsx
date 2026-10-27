"use client";

import type React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Settings,
  TrendingUp,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  BusinessDataResult,
  fetchBusinessDataAction,
  inviteAllEmployeesToConnectCalendarsAction,
} from "./actions";
import { EmployeesDB } from "@/app/types/db";

interface Booking {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
  duration: string;
  price: number;
}

interface QuickStat {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

interface PendingChange {
  id: string;
  type: "application" | "draft";
  status: "submitted" | "pending" | "approved";
  title: string;
  description: string;
  submittedAt: string;
}

interface UserProfile {
  fullName: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<"day" | "week" | "month">("week");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const [businessData, setBusinessData] = useState<BusinessDataResult | null>(null);
  // Load user profile and pending changes only once
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || dataLoaded) return;

      try {
        setLoading(true);

        // Load both user profile and pending changes in parallel
        const [profileResponse, draftResponse] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/business/onboarding/draft"),
        ]);

        // Process profile data
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile({
            fullName: profileData.fullName || "",
            email: user.email || "",
          });
        }

        // Process draft data
        if (draftResponse.ok) {
          const draftData = await draftResponse.json();
          if (draftData.draft) {
            const changes: PendingChange[] = [];

            if (draftData.draft.status === "submitted") {
              changes.push({
                id: draftData.draft.id,
                type: "application",
                status: "submitted",
                title: "Business Application",
                description: "Your business application has been submitted and is under review",
                submittedAt: draftData.draft.last_saved_at || draftData.draft.updated_at,
              });
            } else if (draftData.draft.status === "pending") {
              changes.push({
                id: draftData.draft.id,
                type: "draft",
                status: "pending",
                title: "Draft in Progress",
                description: "You have an incomplete business profile draft",
                submittedAt: draftData.draft.last_saved_at || draftData.draft.updated_at,
              });
            }

            setPendingChanges(changes);
          }
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, dataLoaded]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user?.id || lastFetchedUserIdRef.current === user.id) return;
      lastFetchedUserIdRef.current = user.id;
      const response: BusinessDataResult = await fetchBusinessDataAction();
      console.log("Business data:", response);
      setBusinessData(response);
      console.log("active business:", response.activeBusiness);
    };
    fetchBusinessData();
  }, [user?.id]);

  const handleSendEmployeeCalendarIntegrationReminder = async () => {
    try {
      // call server action to create employee profiles if they don't exist and send reminder to employees to connect their calendars.
      if (!businessData?.activeBusiness?.id || !businessData?.activeBusiness?.name) {
        alert("No active business found");
        return;
      }
      const response = await inviteAllEmployeesToConnectCalendarsAction(
        businessData.activeBusiness.id,
        businessData.activeBusiness.name
      );
      if (!response.success) {
        console.error("Failed to send employee calendar integration reminder:", response.error);
        alert(response.error);
        return;
      }
      console.log("Employee calendar integration reminder response:", response);
    } catch (error) {
      console.error("Error sending employee calendar integration reminder:", error);
    }
  };

  // Quick stats with real data
  const quickStats: QuickStat[] = [
    {
      title: "Today's Bookings",
      value: 0,
      change: "No bookings today",
      trend: "neutral",
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
    },
    {
      title: "This Week's Revenue",
      value: "$0",
      change: "No revenue this week",
      trend: "neutral",
      icon: <DollarSign className="w-5 h-5 text-green-500" />,
    },
    {
      title: "Pending Confirmations",
      value: 0,
      change: "No pending confirmations",
      trend: "neutral",
      icon: <Clock className="w-5 h-5 text-orange-500" />,
    },
    {
      title: "Pending Changes",
      value: pendingChanges.length,
      change:
        pendingChanges.length > 0
          ? `${pendingChanges.length} items need attention`
          : "No pending changes",
      trend: pendingChanges.length > 0 ? "up" : "neutral",
      icon: <FileText className="w-5 h-5 text-purple-500" />,
    },
  ];

  const recentBookings: Booking[] = [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const hasEmployeesPendingCalendarConnection = businessData?.employeesList?.some(
    (employee: EmployeesDB) => employee.calendar_connection_required
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Easerva</span>
              </div>
              <div className="hidden sm:block text-gray-400">|</div>
              <h1 className="hidden sm:block text-lg font-semibold text-gray-900">Dashboard</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Button variant="ghost" className="text-orange-500 font-medium">
                Dashboard
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Bookings
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Services
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Team
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
            </nav>

            {/* Mobile menu button */}
            <Button variant="ghost" className="md:hidden">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Good morning, {userProfile?.fullName || "there"}! 👋
          </h2>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card
              key={index}
              className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    {stat.change && (
                      <p
                        className={`text-xs mt-1 flex items-center ${
                          stat.trend === "up"
                            ? "text-green-600"
                            : stat.trend === "down"
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {stat.trend === "up" && <TrendingUp className="w-3 h-3 mr-1" />}
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Changes Section */}
        {pendingChanges.length > 0 && (
          <div className="mb-8">
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Pending Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingChanges.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{change.title}</p>
                        <p className="text-xs text-gray-600">{change.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(change.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`text-xs ${
                          change.status === "submitted"
                            ? "bg-blue-100 text-blue-800"
                            : change.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        <span className="capitalize">{change.status}</span>
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/business/onboarding/review-application")}
                        className="text-orange-500 border-orange-200 hover:bg-orange-50"
                      >
                        View Application
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Schedule Overview
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      {["day", "week", "month"].map((view) => (
                        <Button
                          key={view}
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedView(view as "day" | "week" | "month")}
                          className={`px-3 py-1 text-sm capitalize ${
                            selectedView === view
                              ? "bg-white text-orange-500 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {view}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar placeholder - would integrate with actual calendar component */}
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Calendar view for {selectedView}</p>
                  <p className="text-sm text-gray-500">
                    Your {selectedView}ly schedule will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <div>
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Recent Bookings
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-orange-500">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {booking.customerName}
                          </p>
                          <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(booking.status)}
                              <span className="capitalize">{booking.status}</span>
                            </span>
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{booking.service}</p>
                        <p className="text-xs text-gray-500">
                          {booking.date} at {booking.time} • {booking.duration}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">${booking.price}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No recent bookings</p>
                    <p className="text-sm text-gray-500">Your recent bookings will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  className="h-20 flex-col space-y-2 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
                  onClick={() => router.push("/dashboard/bookings/new")}
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Add Booking</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                  onClick={() => router.push("/dashboard/calendar/block")}
                >
                  <Calendar className="w-6 h-6 text-gray-600" />
                  <span className="text-sm text-gray-600">Block Time</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                  onClick={() => router.push("/dashboard/team/invite")}
                >
                  <UserPlus className="w-6 h-6 text-gray-600" />
                  <span className="text-sm text-gray-600">Invite Team</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                  onClick={() => router.push("/dashboard/services")}
                >
                  <Edit className="w-6 h-6 text-gray-600" />
                  <span className="text-sm text-gray-600">Edit Services</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent>
            <h1> Quick Look at your Business </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-1">
                <h2>Business Name</h2>
                <p>{businessData?.activeBusiness?.name}</p>
                <p>{`number of employees: ${businessData?.employeesList?.length}`}</p>
                {hasEmployeesPendingCalendarConnection && (
                  <>
                    <p>Send reminder to employees to connect their calendars.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendEmployeeCalendarIntegrationReminder}
                    >
                      Send Reminder
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
