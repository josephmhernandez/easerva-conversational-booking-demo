"use client";

import ServiceLocationComboCard from "../ServiceLocationComboCard";

// Types for the rendered components
interface Service {
  id: string;
  name: string;
  price: number;
  locationId: string;
  priceType?: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
}

interface CalendarResource {
  id: string;
  name: string;
  email?: string;
  type?: string;
  description?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  bookingLogic?: string;
  isNew?: boolean;
  locationId?: string;
  capacity?: {
    maxConcurrent: number;
    bufferTime: number;
  };
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  locationId: string;
  takesBookings: boolean;
  avatar?: string;
  assignmentType?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  isNew?: boolean;
}

interface RequirementItem {
  id?: string;
  displayName?: string;
  logicOperator?: string;
  type?: string;
}

interface ServiceLocationCombo {
  id: string;
  locationId: string;
  locationName: string;
  address: string;
  cardType: string;
  services: Service[];
  resources: CalendarResource[];
  employees?: Employee[];
  employeeId?: string;
  employeeName?: string;
  employeeAvatar?: string;
  employeeCalendar?: Record<string, unknown>;
  combinedFromServices?: Record<string, unknown>[];
  logicType?: string;
  combiningAllowed?: boolean;
  requirements?: RequirementItem[];
}

// interface CalendarAssignment {
//   id: string;
//   assignmentId: string;
//   busyCalendars: Array<{
//     calendarId: string;
//     entityType: string;
//   }>;
//   assignmentName: string;
//   assignmentType: string;
//   defaultBookingCalendar: {
//     calendarId: string;
//     entityType: string;
//   };
// }

// CalendarManagementData removed as it's not used in this component

interface EmployeeBasedStrategyRendererNewProps {
  serviceLocationCombos: ServiceLocationCombo[];
  expandedCards: string[];
  selectedCards: string[];
  combiningMode: boolean;
  canCombineCard: (comboId: string) => boolean;
  onToggleCardExpansion: (comboId: string) => void;
  onCardSelection: (comboId: string) => void;
  onEditRequirements: (combo: ServiceLocationCombo) => void;
  onSplitService: (comboId: string, serviceId: string) => void;
  generateRequirementString: (requirements: RequirementItem[]) => string;
}

export default function EmployeeBasedStrategyRendererNew({
  serviceLocationCombos,
  combiningMode,
  selectedCards,
  expandedCards,
  canCombineCard,
  onToggleCardExpansion,
  onCardSelection,
  onEditRequirements,
  onSplitService,
  generateRequirementString,
}: EmployeeBasedStrategyRendererNewProps) {
  return (
    <div className="space-y-6">
      {/* Employee Cards */}
      <div className="space-y-4">
        {serviceLocationCombos.map((combo) => (
          <ServiceLocationComboCard
            key={combo.id}
            combo={combo}
            isExpanded={expandedCards.includes(combo.id)}
            isSelected={selectedCards.includes(combo.id)}
            combiningMode={combiningMode}
            isDisabled={combiningMode && !canCombineCard(combo.id)}
            onToggleExpansion={onToggleCardExpansion}
            onToggleSelection={onCardSelection}
            onEditRequirements={onEditRequirements}
            onSplitService={onSplitService}
            generateRequirementString={generateRequirementString}
          />
        ))}
      </div>
    </div>
  );
}
