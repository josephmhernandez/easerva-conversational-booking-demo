"use client";

import { BOOKING_STRATEGIES } from "@/app/types/businessTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface BookingStrategyDisplayProps {
  selectedStrategy: string;
}

export default function BookingStrategyDisplay({ selectedStrategy }: BookingStrategyDisplayProps) {
  // const router = useRouter();

  const currentStrategy = BOOKING_STRATEGIES.find((s) => s.id === selectedStrategy);

  // const handleEditStrategy = () => {
  //   router.push("/business/onboarding/booking-strategy");
  // };

  if (!currentStrategy) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Booking Strategy
            </CardTitle>
            <p className="text-sm text-gray-600">
              This strategy was configured in the previous step
            </p>
          </div>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={handleEditStrategy}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Strategy
          </Button> */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentStrategy.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{currentStrategy.description}</p>
              <div className="mt-2">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    currentStrategy.complexity === "Simple"
                      ? "bg-green-100 text-green-800"
                      : currentStrategy.complexity === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {currentStrategy.complexity} Setup
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Combining Mode Toggle */}
        {/* {supportedStrategies.includes(selectedStrategy) && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Service Combining</p>
                <p className="text-sm text-gray-600">
                  Allow combining multiple services into single booking cards
                </p>
              </div>
              <Switch checked={combiningMode} onCheckedChange={onCombiningModeChange} />
            </div>
          </div>
        )} */}
      </CardContent>
    </Card>
  );
}
