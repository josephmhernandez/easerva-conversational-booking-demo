// /app/lib/calendar-logic-evaluator.ts
// Evaluates AND/OR logic expressions for calendar group requirements

interface Requirement {
  sequence_order: number;
  logic_operator: string | null; // "AND", "OR", "START_GROUP", "END_GROUP", null
  calendar_group_id: string | null;
  entity_type: string;
  entity_id: string;
  display_name: string;
}

interface CalendarGroupAvailability {
  calendar_group_id: string;
  is_available: boolean; // true if all calendars in group are free
  conflicts?: Array<{
    calendar_id: string;
    start: string;
    end: string;
  }>;
}

interface EvaluationResult {
  is_available: boolean;
  satisfied_groups: string[]; // calendar_group_ids that satisfy the expression
  conflicts: Array<{
    calendarGroupId: string;
    entity: string;
    entityType: string;
    conflictingEvent: {
      title: string;
      start: string;
      end: string;
    };
  }>;
}

/**
 * Evaluates a logical expression of calendar group requirements
 * Handles AND/OR operations and grouped expressions with parentheses
 *
 * @param requirements - Sorted requirements by sequence_order
 * @param groupAvailabilities - Map of calendar_group_id → availability status
 * @param startTime - ISO8601 start time
 * @param endTime - ISO8601 end time
 */
export function evaluateRequirementExpression(
  requirements: Requirement[],
  groupAvailabilities: Map<string, CalendarGroupAvailability>,
  startTime: string,
  endTime: string
): EvaluationResult {
  if (requirements.length === 0) {
    return {
      is_available: true,
      satisfied_groups: [],
      conflicts: [],
    };
  }

  // Build expression tree
  const expression = buildExpressionTree(requirements);

  // Evaluate the expression
  const evaluation = evaluateExpression(expression, groupAvailabilities);

  // Build conflicts list
  const conflicts: EvaluationResult["conflicts"] = [];
  const satisfied_groups: string[] = [];

  for (const req of requirements) {
    if (!req.calendar_group_id) continue;

    const availability = groupAvailabilities.get(req.calendar_group_id);
    if (!availability) continue;

    if (availability.is_available) {
      satisfied_groups.push(req.calendar_group_id);
    } else {
      // Add conflict for unavailable groups
      conflicts.push({
        calendarGroupId: req.calendar_group_id,
        entity: req.display_name,
        entityType: req.entity_type,
        conflictingEvent: {
          title: "Existing Appointment",
          start: startTime,
          end: endTime,
        },
      });
    }
  }

  return {
    is_available: evaluation,
    satisfied_groups,
    conflicts: evaluation ? [] : conflicts, // Only return conflicts if overall unavailable
  };
}

/**
 * Builds an expression tree from requirements
 * Handles START_GROUP/END_GROUP operators to create parenthesized groups
 */
function buildExpressionTree(requirements: Requirement[]): ExpressionNode {
  if (requirements.length === 0) {
    return { type: "value", value: true };
  }

  const nodes: ExpressionNode[] = [];
  let i = 0;
  const groupStack: number[] = []; // Stack to track nested groups

  while (i < requirements.length) {
    const req = requirements[i];

    if (req.logic_operator === "START_GROUP") {
      // Mark the start of a group
      groupStack.push(nodes.length);
      i++;
      continue;
    }

    if (req.logic_operator === "END_GROUP") {
      // End of group - wrap the nodes since last group start
      if (groupStack.length > 0) {
        const groupStart = groupStack.pop()!;
        // Calculate how many nodes to remove (from groupStart to current end)
        const nodeCount = nodes.length - groupStart;
        if (nodeCount > 0) {
          const groupNodes = nodes.splice(groupStart, nodeCount);
          const groupNode = evaluateFlatExpression(groupNodes);
          nodes.push({ type: "group", node: groupNode });
        }
      }
      i++;
      continue;
    }

    // Regular requirement with calendar_group_id
    if (req.calendar_group_id) {
      const valueNode: ExpressionNode = {
        type: "calendar_group",
        calendar_group_id: req.calendar_group_id,
      };

      if (nodes.length === 0) {
        // First node - just add the value
        nodes.push(valueNode);
      } else {
        // Add operator and value
        const operator = req.logic_operator || "AND";
        if (operator === "AND" || operator === "OR") {
          nodes.push({ type: "operator", operator });
          nodes.push(valueNode);
        } else {
          // No operator specified, default to AND
          nodes.push({ type: "operator", operator: "AND" });
          nodes.push(valueNode);
        }
      }
    }

    i++;
  }

  // Close any remaining open groups
  while (groupStack.length > 0) {
    const groupStart = groupStack.pop()!;
    // Calculate how many nodes to remove (from groupStart to current end)
    const nodeCount = nodes.length - groupStart;
    if (nodeCount > 0) {
      const groupNodes = nodes.splice(groupStart, nodeCount);
      const groupNode = evaluateFlatExpression(groupNodes);
      nodes.push({ type: "group", node: groupNode });
    }
  }

  // Evaluate the flat expression
  return evaluateFlatExpression(nodes);
}

type ExpressionNode =
  | { type: "value"; value: boolean }
  | { type: "calendar_group"; calendar_group_id: string }
  | { type: "operator"; operator: "AND" | "OR" }
  | { type: "group"; node: ExpressionNode }
  | { type: "binary"; left: ExpressionNode; operator: "AND" | "OR"; right: ExpressionNode };

/**
 * Evaluates a flat list of nodes into a binary expression tree
 */
function evaluateFlatExpression(nodes: ExpressionNode[]): ExpressionNode {
  if (nodes.length === 0) {
    return { type: "value", value: true };
  }

  if (nodes.length === 1) {
    return nodes[0];
  }

  // Process AND operators first (higher precedence)
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.type === "operator" && node.operator === "AND") {
      const left: ExpressionNode = i > 0 ? nodes[i - 1] : { type: "value", value: true };
      const right: ExpressionNode =
        i < nodes.length - 1 ? nodes[i + 1] : { type: "value", value: true };

      const binaryNode: ExpressionNode = {
        type: "binary",
        left,
        operator: "AND",
        right,
      };
      nodes.splice(i - 1, 3, binaryNode);
      i = 0; // Restart
      continue;
    }
    i++;
  }

  // Process OR operators (lower precedence)
  i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.type === "operator" && node.operator === "OR") {
      const left: ExpressionNode = i > 0 ? nodes[i - 1] : { type: "value", value: true };
      const right: ExpressionNode =
        i < nodes.length - 1 ? nodes[i + 1] : { type: "value", value: true };

      const binaryNode: ExpressionNode = {
        type: "binary",
        left,
        operator: "OR",
        right,
      };
      nodes.splice(i - 1, 3, binaryNode);
      i = 0; // Restart
      continue;
    }
    i++;
  }

  return nodes[0];
}

/**
 * Evaluates an expression node against calendar group availabilities
 */
function evaluateExpression(
  node: ExpressionNode,
  groupAvailabilities: Map<string, CalendarGroupAvailability>
): boolean {
  switch (node.type) {
    case "value":
      return node.value;

    case "calendar_group":
      const availability = groupAvailabilities.get(node.calendar_group_id);
      return availability?.is_available ?? false;

    case "group":
      return evaluateExpression(node.node, groupAvailabilities);

    case "binary":
      const leftValue = evaluateExpression(node.left, groupAvailabilities);
      const rightValue = evaluateExpression(node.right, groupAvailabilities);

      if (node.operator === "AND") {
        return leftValue && rightValue;
      } else {
        // OR
        return leftValue || rightValue;
      }

    default:
      return false;
  }
}
