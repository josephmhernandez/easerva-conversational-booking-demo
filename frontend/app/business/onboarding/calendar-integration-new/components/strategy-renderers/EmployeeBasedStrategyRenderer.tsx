"use client";

import ServiceLocationComboCard from "../ServiceLocationComboCard";

interface Service {
  id: string;
  name: string;
  price: number;
  locationId: string;
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

interface CronofyCalendar {
  profile_id: string;
  calendar_id: string;
  profile_name: string;
  calendar_name: string;
  provider_name: string;
  calendar_deleted: boolean;
  calendar_primary: boolean;
  is_busy_calendar: boolean;
  permission_level: string;
  calendar_readonly: boolean;
  is_primary_booking: boolean;
  is_booking_calendar: boolean;
  calendar_attachments_available: boolean;
  calendar_integrated_conferencing_available: boolean;
}

interface CalendarAssignment {
  id: string;
  assignmentId: string;
  busyCalendars: Array<{
    calendarId: string;
    entityType: string;
  }>;
  assignmentName: string;
  assignmentType: string;
  defaultBookingCalendar: {
    calendarId: string;
    entityType: string;
  };
}

interface CalendarManagementData {
  cronofyCalendars: CronofyCalendar[];
  calendarAssignments: CalendarAssignment[];
  cronofyElementToken: string;
}

interface EmployeeBasedStrategyRendererProps {
  serviceLocationCombos: ServiceLocationCombo[];
  expandedCards: string[];
  selectedCards: string[];
  combiningMode: boolean;
  calendarManagementData?: CalendarManagementData;
  canCombineCard: (comboId: string) => boolean;
  onToggleCardExpansion: (comboId: string) => void;
  onCardSelection: (comboId: string) => void;
  onEditRequirements: (combo: ServiceLocationCombo) => void;
  onSplitService: (comboId: string, serviceId: string) => void;
  generateRequirementString: (requirements: RequirementItem[]) => string;
}

export default function EmployeeBasedStrategyRenderer({
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
}: EmployeeBasedStrategyRendererProps) {
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
