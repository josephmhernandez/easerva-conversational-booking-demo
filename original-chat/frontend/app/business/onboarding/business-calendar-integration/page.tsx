"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  businessCalendarIntegrationPage,
  goNext,
  goPrevious,
} from "../../../constants/routeConstants";

interface CalendarProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  popular?: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  connected: boolean;
  connecting: boolean;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  connecting: boolean;
}

interface BusyCalendar {
  id: string;
  name: string;
  provider: string;
  selected: boolean;
}

export default function BusinessCalendarIntegrationPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<
    "simple" | "location" | "employee" | "resource"
  >("employee"); // This would come from previous step
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [businessCalendarConnected, setBusinessCalendarConnected] = useState(false);
  const [connectingBusiness, setConnectingBusiness] = useState(false);
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@business.com",
      connected: false,
      connecting: false,
    },
    { id: "2", name: "Mike Chen", email: "mike@business.com", connected: true, connecting: false },
    {
      id: "3",
      name: "Lisa Rodriguez",
      email: "lisa@business.com",
      connected: false,
      connecting: false,
    },
  ]);
  const [resources, setResources] = useState<Resource[]>([
    { id: "1", name: "Exam Room 1", type: "room", connected: false, connecting: false },
    { id: "2", name: "MRI Machine", type: "equipment", connected: false, connecting: false },
    { id: "3", name: "Conference Room A", type: "room", connected: true, connecting: false },
  ]);
  const [busyCalendars, setBusyCalendars] = useState<BusyCalendar[]>([
    { id: "1", name: "Personal Calendar", provider: "Google", selected: true },
    { id: "2", name: "Family Events", provider: "Google", selected: false },
    { id: "3", name: "Work Calendar", provider: "Outlook", selected: true },
    { id: "4", name: "Holidays", provider: "Apple", selected: false },
  ]);
  const [testingConnection, setTestingConnection] = useState(false);

  const providers: CalendarProvider[] = [
    {
      id: "google",
      name: "Google Calendar",
      logo: "📅",
      description: "Most popular choice",
      popular: true,
    },
    {
      id: "outlook",
      name: "Outlook / Office 365",
      logo: "📧",
      description: "Microsoft ecosystem",
    },
    {
      id: "apple",
      name: "Apple Calendar",
      logo: "🍎",
      description: "iCloud integration",
    },
    {
      id: "caldav",
      name: "Other CalDAV",
      logo: "🔗",
      description: "Advanced setup",
    },
  ];

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
  };

  const handleBusinessConnect = () => {
    setConnectingBusiness(true);
    setTimeout(() => {
      setConnectingBusiness(false);
      setBusinessCalendarConnected(true);
    }, 2000);
  };

  const handleEmployeeConnect = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, connecting: true } : emp))
    );

    setTimeout(() => {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ? { ...emp, connecting: false, connected: true } : emp
        )
      );
    }, 2000);
  };

  const handleResourceConnect = (resourceId: string) => {
    setResources((prev) =>
      prev.map((res) => (res.id === resourceId ? { ...res, connecting: true } : res))
    );

    setTimeout(() => {
      setResources((prev) =>
        prev.map((res) =>
          res.id === resourceId ? { ...res, connecting: false, connected: true } : res
        )
      );
    }, 2000);
  };

  const handleBusyCalendarToggle = (calendarId: string) => {
    setBusyCalendars((prev) =>
      prev.map((cal) => (cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal))
    );
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
    }, 1500);
  };

  const getStrategyIcon = () => {
    switch (selectedStrategy) {
      case "simple":
        return <Calendar className="h-5 w-5" />;
      case "location":
        return <Building className="h-5 w-5" />;
      case "employee":
        return <User className="h-5 w-5" />;
      case "resource":
        return <Wrench className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getStrategyTitle = () => {
    switch (selectedStrategy) {
      case "simple":
        return "Simple Calendar Strategy";
      case "location":
        return "Location-based Strategy";
      case "employee":
        return "Employee-based Strategy";
      case "resource":
        return "Resource-based Strategy";
      default:
        return "Calendar Strategy";
    }
  };

  const connectedEmployees = employees.filter((emp) => emp.connected).length;
  const connectedResources = resources.filter((res) => res.connected).length;
  const selectedBusyCalendars = busyCalendars.filter((cal) => cal.selected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <Button
            onClick={() => {
              // set selectedStrategy to "simple"
              setSelectedStrategy("simple");
            }}
          >
            Simple
          </Button>
          <Button
            onClick={() => {
              setSelectedStrategy("employee");
            }}
          >
            Employee
          </Button>
          <Button
            onClick={() => {
              setSelectedStrategy("resource");
            }}
          >
            Resource
          </Button>
          <Button
            onClick={() => {
              setSelectedStrategy("location");
            }}
          >
            Location
          </Button>
          <div className="flex items-center gap-4 mb-6">
            <Link href={goPrevious(businessCalendarIntegrationPage)?.pageRef ?? ""}>
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Step 9 of 10</span>
                <span className="text-sm text-gray-500">90%</span>
              </div>
              <Progress value={90} className="h-2" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Connect your calendars
            </h1>
            <p className="text-gray-600">
              Set up calendar integration based on your booking strategy
            </p>
          </div>
        </div>

        {/* Strategy Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {getStrategyIcon()}
            <div>
              <h2 className="text-lg font-semibold">{getStrategyTitle()}</h2>
              <p className="text-sm text-gray-600">Selected in previous step</p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        {!selectedProvider && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Choose your calendar provider</h2>
            <div className="grid gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider.id)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.logo}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {provider.popular && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{provider.description}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Connections */}
        {selectedProvider && (
          <div className="space-y-6">
            {/* Simple Strategy */}
            {selectedStrategy === "simple" && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Business Calendar Connection</h2>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Main Business Calendar</p>
                      <p className="text-sm text-gray-600">All bookings will be added here</p>
                    </div>
                  </div>
                  {businessCalendarConnected ? (
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      onClick={handleBusinessConnect}
                      disabled={connectingBusiness}
                      size="sm"
                      loading={connectingBusiness}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Employee Strategy */}
            {selectedStrategy === "employee" && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Employee Calendar Connections</h2>
                  <Badge variant="outline">
                    {connectedEmployees}/{employees.length} Connected
                  </Badge>
                </div>
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                        </div>
                      </div>
                      {employee.connected ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleEmployeeConnect(employee.id)}
                          disabled={employee.connecting}
                          size="sm"
                          loading={employee.connecting}
                        >
                          Send Invite
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {connectedEmployees < employees.length && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm text-amber-800">
                        Some employees haven&apos;t connected their calendars yet. You can complete
                        this later.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resource Strategy */}
            {selectedStrategy === "resource" && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Resource Calendar Connections</h2>
                  <Badge variant="outline">
                    {connectedResources}/{resources.length} Connected
                  </Badge>
                </div>
                <div className="space-y-3">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">{resource.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{resource.type}</p>
                        </div>
                      </div>
                      {resource.connected ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleResourceConnect(resource.id)}
                          disabled={resource.connecting}
                          size="sm"
                          loading={resource.connecting}
                        >
                          Create Calendar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Busy Calendars */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Busy Calendars</h2>
                <Badge variant="outline">{selectedBusyCalendars} Selected</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select calendars to check for conflicts when scheduling bookings
              </p>
              <div className="space-y-3">
                {busyCalendars.map((calendar) => (
                  <div key={calendar.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`busy-${calendar.id}`}
                      checked={calendar.selected}
                      onCheckedChange={() => handleBusyCalendarToggle(calendar.id)}
                    />
                    <label
                      htmlFor={`busy-${calendar.id}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{calendar.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {calendar.provider}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Connection */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Test Connection</h2>
              <p className="text-sm text-gray-600 mb-4">
                Verify that your calendar integration is working properly
              </p>
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
                loading={testingConnection}
              >
                <Clock className="h-4 w-4" />
                Test Connection
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/onboarding/setup-complete" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Continue to Final Step
                </Button>
              </Link>
              <Button variant="outline" className="sm:w-auto bg-transparent">
                Complete Later
              </Button>
              <Button
                onClick={() => router.push(goNext(businessCalendarIntegrationPage)?.pageRef ?? "")}
              >
                Continue Route B
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
