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

interface LocationBasedStrategyRendererProps {
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

export default function LocationBasedStrategyRenderer({
  serviceLocationCombos,
  expandedCards,
  selectedCards,
  combiningMode,
  canCombineCard,
  onToggleCardExpansion,
  onCardSelection,
  onEditRequirements,
  onSplitService,
  generateRequirementString,
}: LocationBasedStrategyRendererProps) {
  return (
    <div className="space-y-6">
      {/* Location Cards */}
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
