"use client";

interface BusinessCalendar {
  provider: string;
  connectionStatus: string;
  calendarId: string;
  calendarName: string;
}

interface CalendarProvider {
  id: string;
  name: string;
}

// CalendarAssignment removed as it's not used in this component

// CalendarManagementData removed as it's not used in this component

interface SimpleStrategyRendererNewProps {
  businessCalendar: BusinessCalendar;
  calendarProviders: CalendarProvider[];
  onBusinessCalendarChange: (calendar: BusinessCalendar) => void;
  onConnectionTest: (type: string, id?: string) => void;
}

export default function SimpleStrategyRendererNew({
  businessCalendar,
  calendarProviders,
  onBusinessCalendarChange,
  onConnectionTest,
}: SimpleStrategyRendererNewProps) {
  return (
    <div className="space-y-6">
      {/* Business Calendar Configuration */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Business Calendar</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar Provider
            </label>
            <select
              value={businessCalendar.provider}
              onChange={(e) =>
                onBusinessCalendarChange({
                  ...businessCalendar,
                  provider: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a provider</option>
              {calendarProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Status
            </label>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  businessCalendar.connectionStatus === "connected"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {businessCalendar.connectionStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
              <button
                onClick={() => onConnectionTest("business")}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Test Connection
              </button>
            </div>
          </div>

          {businessCalendar.calendarId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Name</label>
              <input
                type="text"
                value={businessCalendar.calendarName}
                onChange={(e) =>
                  onBusinessCalendarChange({
                    ...businessCalendar,
                    calendarName: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter calendar name"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
