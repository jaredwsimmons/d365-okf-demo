/**
 * Parses Power Automate / Azure Logic Apps workflow JSON definitions
 * into React Flow nodes and edges for visualization.
 *
 * Handles: sequential chains (runAfter), parallel branches, conditions (If/Else),
 * scopes (try/catch), loops (Foreach/Until), and switch cases.
 */

import { type Node, type Edge, MarkerType } from "@xyflow/react";

// ── Types ──────────────────────────────────────────────────────────

export interface WorkflowDefinition {
  properties: {
    definition: {
      triggers: Record<string, LogicAppAction>;
      actions: Record<string, LogicAppAction>;
    };
    connectionReferences?: Record<string, { api?: { name?: string } }>;
  };
}

interface LogicAppAction {
  type: string;
  kind?: string;
  runAfter?: Record<string, string[]>;
  actions?: Record<string, LogicAppAction>;
  else?: { actions?: Record<string, LogicAppAction> };
  cases?: Record<string, { actions?: Record<string, LogicAppAction> }>;
  inputs?: Record<string, unknown>;
  expression?: unknown;
  foreach?: string;
  metadata?: Record<string, unknown>;
  description?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  type: string; // Action type: OpenApiConnection, SetVariable, If, Scope, etc.
  kind?: string;
  nodeType: "trigger" | "action" | "scope" | "condition-branch" | "terminal";
  parentId?: string;
  description?: string;
  connector?: string; // e.g. shared_commondataserviceforapps
  operation?: string; // e.g. ListRecords, GetItem
}

export interface ParsedWorkflow {
  nodes: Node[];
  edges: Edge[];
}

// ── Action type classification ─────────────────────────────────────

const SCOPE_TYPES = new Set(["Scope", "Foreach", "Until", "Changeset"]);
const CONDITION_TYPES = new Set(["If", "Switch"]);
const VARIABLE_TYPES = new Set(["InitializeVariable", "SetVariable", "IncrementVariable", "DecrementVariable", "AppendToArrayVariable", "AppendToStringVariable"]);
const CONNECTOR_TYPES = new Set(["OpenApiConnection", "OpenApiConnectionWebhook", "ApiConnection", "ApiConnectionWebhook"]);
const CONTROL_TYPES = new Set(["Compose", "Expression", "ParseJson", "Select", "Filter", "Join", "CreateArray", "CreateHtmlTable", "CreateCsvTable"]);

function getNodeCategory(type: string): string {
  if (CONNECTOR_TYPES.has(type)) return "connector";
  if (VARIABLE_TYPES.has(type)) return "variable";
  if (SCOPE_TYPES.has(type)) return "scope";
  if (CONDITION_TYPES.has(type)) return "condition";
  if (CONTROL_TYPES.has(type)) return "control";
  if (type === "Terminate") return "terminate";
  if (type === "Response") return "response";
  if (type === "Workflow") return "workflow";
  if (type === "Request" || type === "OpenApiConnectionWebhook" || type === "Recurrence") return "trigger";
  return "default";
}

function getConnectorInfo(action: LogicAppAction): { connector?: string; operation?: string; entity?: string } {
  if (!action.inputs?.host) return {};
  const host = action.inputs.host as Record<string, unknown>;
  const params = action.inputs.parameters as Record<string, unknown> | undefined;
  return {
    connector: host.connectionName as string | undefined,
    operation: host.operationId as string | undefined,
    entity: params?.entityName as string | undefined,
  };
}

// Friendly names for common connectors
const CONNECTOR_LABELS: Record<string, string> = {
  shared_commondataserviceforapps: "Dataverse",
  shared_dynamicsax: "F&O",
  shared_office365: "Office 365",
  shared_office365users: "Office 365 Users",
  shared_sharepointonline: "SharePoint",
  shared_teams: "Teams",
  shared_powerappsnotification: "PA Notification",
  shared_powerappsnotification_1: "PA Notification",
  shared_approvals: "Approvals",
  shared_sendmail: "Send Mail",
  shared_flowmanagement: "Flow Management",
};

// Friendly names for common operations
const OPERATION_LABELS: Record<string, string> = {
  GetItem: "Get Row",
  ListRecords: "List Rows",
  CreateRecord: "Create Row",
  UpdateRecord: "Update Row",
  DeleteRecord: "Delete Row",
  ExecuteProcedure: "Execute Action",
  SubscribeWebhookTrigger: "On Change",
  ListRecordsWithOrganization: "List Rows",
  GetItemV2: "Get Row",
};

function getVariableInfo(action: LogicAppAction): { varName?: string; varType?: string; varValue?: string } {
  if (!action.inputs) return {};
  const inputs = action.inputs as Record<string, unknown>;

  // InitializeVariable
  const vars = inputs.variables as Array<{ name?: string; type?: string; value?: unknown }> | undefined;
  if (vars && vars[0]) {
    const v = vars[0];
    let valStr: string | undefined;
    if (v.value !== undefined && v.value !== null && v.value !== "") {
      valStr = typeof v.value === "string" ? v.value : JSON.stringify(v.value);
    }
    return { varName: v.name, varType: v.type, varValue: valStr };
  }

  // SetVariable
  const name = inputs.name as string | undefined;
  if (name) {
    const val = inputs.value;
    let valStr: string | undefined;
    if (val !== undefined && val !== null) {
      valStr = typeof val === "string" ? val : JSON.stringify(val);
    }
    return { varName: name, varValue: valStr };
  }

  return {};
}

function getConditionExpression(action: LogicAppAction): string | undefined {
  if (!action.expression) return undefined;
  const expr = action.expression as Record<string, unknown>;

  // Common patterns: { equals: [...] }, { not: { equals: [...] } }, { and: [...] }, { or: [...] }
  const formatExpr = (e: unknown, depth: number): string => {
    if (depth > 8) return "...";
    if (typeof e !== "object" || e === null) return String(e);
    const obj = e as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";

    const op = keys[0]!;
    const args = obj[op];

    // 'not' wraps an object in PA, not an array — handle before the array guard
    if (op === "not") {
      const inner = Array.isArray(args) ? args[0] : args;
      return `NOT (${formatExpr(inner, depth + 1)})`;
    }

    if (Array.isArray(args)) {
      if (op === "equals" || op === "greater" || op === "less" || op === "greaterOrEquals" || op === "lessOrEquals") {
        const left = simplifyExpression(String(args[0]));
        const right = simplifyExpression(String(args[1]));
        const opSymbol = op === "equals" ? "==" : op === "greater" ? ">" : op === "less" ? "<" : op === "greaterOrEquals" ? ">=" : "<=";
        return `${left} ${opSymbol} ${right}`;
      }
      if (op === "and" || op === "or") {
        return args.map((a: unknown) => formatExpr(a, depth + 1)).join(` ${op.toUpperCase()} `);
      }
    }
    return `${op}(...)`;
  };

  return formatExpr(expr, 0);
}

function simplifyExpression(expr: string): string {
  // Simplify Power Automate expressions for readability
  // @outputs('Get_WO_Product')?['body/fieldname'] → Get_WO_Product.fieldname
  return expr
    .replace(/@{([^}]+)}/g, "$1")  // Strip @{...} wrapper
    .replace(/@(outputs|body|triggerBody|triggerOutputs)\('([^']+)'\)\??\['body\/([^']+)'\]/g, "$2.$3")
    .replace(/@(outputs|body)\('([^']+)'\)\??\['body\/?'?\]?/g, "$2")
    .replace(/@(empty|length|null|equals)\(([^)]+)\)/g, "$1($2)")
    .replace(/@triggerBody\(\)\??\['([^']+)'\]/g, "trigger.$1")
    .replace(/outputs\('([^']+)'\)\??\['body\/([^']+)'\]/g, "$1.$2")
    .replace(/outputs\('([^']+)'\)/g, "$1")
    .replace(/_value'/g, "'"); // Clean up lookup field suffixes
}

function getTriggerDetail(trigger: LogicAppAction): string | undefined {
  const params = trigger.inputs?.parameters as Record<string, unknown> | undefined;
  if (!params) {
    // HTTP trigger
    if (trigger.kind === "Http") {
      const schema = (trigger.inputs?.schema as Record<string, unknown>) || {};
      const props = schema.properties as Record<string, unknown> | undefined;
      if (props) return `POST { ${Object.keys(props).join(", ")} }`;
      return "HTTP POST";
    }
    if (trigger.type === "Recurrence") {
      const recur = trigger.inputs?.recurrence as Record<string, unknown> | undefined;
      if (recur) return `Every ${recur.interval} ${recur.frequency}`;
    }
    return undefined;
  }
  // Dataverse trigger
  const entity = params["subscriptionRequest/entityname"] as string | undefined;
  const msg = params["subscriptionRequest/message"] as number | undefined;
  const msgLabel = msg === 1 ? "Create" : msg === 2 ? "Delete" : msg === 3 ? "Update" : msg === 4 ? "Create/Update" : undefined;
  const parts: string[] = [entity, msgLabel].filter(Boolean) as string[];
  const filterAttrs = params["subscriptionRequest/filteringattributes"] as string | undefined;
  const filterExpr = params["subscriptionRequest/filterexpression"] as string | undefined;
  if (filterAttrs) parts.push(`[${filterAttrs}]`);
  else if (filterExpr) parts.push(simplifyExpression(filterExpr));
  return parts.length > 0 ? parts.join(" → ") : undefined;
}

function cleanLabel(name: string): string {
  // Clean up underscores and common prefixes for readability
  return name.replace(/_/g, " ").replace(/^(Set variable|Set_variable)\s*/i, "Set ");
}

// ── Parser ─────────────────────────────────────────────────────────

export function parseWorkflowDefinition(
  definition: WorkflowDefinition,
  workflowNameMap?: Map<string, string>, // GUID -> display name, for resolving child flows
): ParsedWorkflow {
  const defn = definition.properties.definition;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nodeIndex = 0;
  const nodeIdMap = new Map<string, string>(); // action name -> node id (scoped)

  // Helper: generate unique node ID
  function nextId(prefix: string = "n"): string {
    return `${prefix}_${nodeIndex++}`;
  }

  // ── Parse triggers ──
  const triggerEntries = Object.entries(defn.triggers);
  const triggerIds: string[] = [];

  for (const [name, trigger] of triggerEntries) {
    const id = nextId("trigger");
    triggerIds.push(id);

    const triggerType = trigger.kind === "Http" ? "HTTP Request" :
      trigger.type === "Recurrence" ? "Recurrence" :
        trigger.type === "OpenApiConnectionWebhook" ? "Dataverse Trigger" :
          trigger.type;

    const triggerDetail = getTriggerDetail(trigger);

    nodes.push({
      id,
      type: "flowAction",
      position: { x: 0, y: 0 }, // ELK will compute
      data: {
        label: cleanLabel(name),
        actionType: triggerType,
        category: "trigger",
        description: trigger.description,
        detail: triggerDetail,
      },
    });
  }

  // ── Parse actions recursively ──
  function parseActions(
    actions: Record<string, LogicAppAction>,
    parentId?: string,
    scopePrefix: string = ""
  ): { entryIds: string[]; exitIds: string[] } {
    const actionEntries = Object.entries(actions);
    if (actionEntries.length === 0) return { entryIds: [], exitIds: [] };

    // Build runAfter dependency map
    const dependsOn = new Map<string, string[]>(); // action -> actions it depends on
    const dependedBy = new Map<string, string[]>(); // action -> actions that depend on it
    const allNames = new Set(actionEntries.map(([name]) => name));

    for (const [name, action] of actionEntries) {
      const deps = Object.keys(action.runAfter || {});
      // Filter to only deps within this scope
      const scopedDeps = deps.filter((d) => allNames.has(d));
      dependsOn.set(name, scopedDeps);
      for (const dep of scopedDeps) {
        if (!dependedBy.has(dep)) dependedBy.set(dep, []);
        dependedBy.get(dep)!.push(name);
      }
    }

    // Find entry points (no deps in this scope) and exit points (nothing depends on them)
    const entryNames = actionEntries.filter(([name]) => {
      const deps = dependsOn.get(name) || [];
      return deps.length === 0;
    }).map(([name]) => name);

    const exitNames = actionEntries.filter(([name]) => {
      const depBy = dependedBy.get(name) || [];
      return depBy.length === 0;
    }).map(([name]) => name);

    // Create nodes and edges for each action
    const nameToId = new Map<string, string>();

    for (const [name, action] of actionEntries) {
      const id = nextId("a");
      nameToId.set(name, id);
      const scopedName = scopePrefix ? `${scopePrefix}.${name}` : name;
      nodeIdMap.set(scopedName, id);

      const category = getNodeCategory(action.type);
      const connInfo = getConnectorInfo(action);
      const varInfo = VARIABLE_TYPES.has(action.type) ? getVariableInfo(action) : {};
      const condExpr = CONDITION_TYPES.has(action.type) ? getConditionExpression(action) : undefined;

      // Build detail string based on action type
      let detail: string | undefined;
      let subLines: string[] | undefined;
      if (CONNECTOR_TYPES.has(action.type)) {
        const connLabel = connInfo.connector ? (CONNECTOR_LABELS[connInfo.connector] || connInfo.connector.replace("shared_", "")) : undefined;
        const opLabel = connInfo.operation ? (OPERATION_LABELS[connInfo.operation] || connInfo.operation) : undefined;
        const parts = [opLabel, connInfo.entity, connLabel ? `(${connLabel})` : undefined].filter(Boolean);
        detail = parts.join(" · ");
        // Surface field-level detail for key operations
        const opParams = action.inputs?.parameters as Record<string, unknown> | undefined;
        if (connInfo.operation === "UpdateRecord" && opParams) {
          const fields = Object.keys(opParams).filter((k) => k.startsWith("item/")).map((k) => k.slice(5));
          if (fields.length > 0) subLines = fields;
        } else if ((connInfo.operation === "ListRecords" || connInfo.operation === "ListRecordsWithOrganization") && opParams) {
          const filter = opParams["$filter"] as string | undefined;
          if (filter) detail += ` · ${simplifyExpression(filter)}`;
        }
      } else if (varInfo.varName) {
        const parts = [varInfo.varName, varInfo.varType ? `(${varInfo.varType})` : undefined];
        detail = parts.filter(Boolean).join(" ");
        if (varInfo.varValue) detail += ` = ${varInfo.varValue}`;
      } else if (condExpr) {
        detail = condExpr;
      } else if (action.type === "Foreach") {
        const each = action.foreach as string | undefined;
        if (each) detail = simplifyExpression(each);
      } else if (action.type === "Workflow") {
        const wfHost = action.inputs?.host as Record<string, unknown> | undefined;
        const wfRef = wfHost?.workflowReferenceName as string | undefined;
        if (wfRef && workflowNameMap) {
          const refGuid = wfRef.replace(/[{}-]/g, "").toUpperCase();
          // Try exact match, then try normalized
          const resolved = workflowNameMap.get(wfRef.toUpperCase()) ||
            [...workflowNameMap.entries()].find(([k]) => k.replace(/-/g, "") === refGuid)?.[1];
          detail = resolved ? `→ ${resolved}` : "Child Flow";
        } else {
          detail = "Child Flow";
        }
        // Also show input parameters if present
        const body = action.inputs?.body as Record<string, unknown> | undefined;
        if (body) {
          const params = Object.keys(body).join(", ");
          if (params) detail += ` (${params})`;
        }
      } else if (action.type === "Compose") {
        const inp = action.inputs;
        if (typeof inp === "string") {
          detail = simplifyExpression(inp);
        }
      } else if (action.type === "Terminate") {
        const status = (action.inputs?.runStatus as string | undefined) || "";
        const errObj = action.inputs?.runError as Record<string, unknown> | undefined;
        const errorMsg = errObj?.message as string | undefined;
        detail = status + (errorMsg ? ` · ${errorMsg}` : "");
      } else if (action.type === "Response") {
        const statusCode = action.inputs?.statusCode as number | string | undefined;
        const body = action.inputs?.body as Record<string, unknown> | undefined;
        detail = statusCode ? `HTTP ${statusCode}` : undefined;
        if (body && typeof body === "object") {
          const bodyKeys = Object.keys(body).join(", ");
          if (bodyKeys) detail = (detail ? `${detail} · ` : "") + `{${bodyKeys}}`;
        }
      }

      // Determine if this is a container (has children)
      const isContainer = SCOPE_TYPES.has(action.type) || CONDITION_TYPES.has(action.type);

      nodes.push({
        id,
        type: isContainer ? "flowGroup" : "flowAction",
        position: { x: 0, y: 0 },
        ...(parentId ? { parentId, extent: "parent" as const } : {}),
        data: {
          label: cleanLabel(name),
          actionType: action.type,
          category,
          description: action.description,
          connector: connInfo.connector,
          operation: connInfo.operation,
          entity: connInfo.entity,
          detail,
          subLines,
          isContainer,
        },
        style: isContainer ? { width: 300, height: 200 } : undefined,
      });

      // Parse nested children for scopes/conditions
      if (SCOPE_TYPES.has(action.type) && action.actions) {
        parseActions(action.actions, id, scopedName);
      }

      if (action.type === "If") {
        // "Yes" branch — no edge from condition to branch (they're parent/child, visually nested)
        if (action.actions && Object.keys(action.actions).length > 0) {
          const yesId = nextId("branch");
          nodes.push({
            id: yesId,
            type: "flowBranch",
            position: { x: 0, y: 0 },
            parentId: id,
            extent: "parent" as const,
            data: { label: "Yes", category: "condition-yes" },
          });
          const childResult = parseActions(action.actions, id, `${scopedName}.yes`);
          for (const entryId of childResult.entryIds) {
            edges.push({ id: `e_${yesId}_${entryId}`, source: yesId, target: entryId, type: "smoothstep" });
          }
        }
        // "No" / Else branch
        if (action.else?.actions && Object.keys(action.else.actions).length > 0) {
          const noId = nextId("branch");
          nodes.push({
            id: noId,
            type: "flowBranch",
            position: { x: 0, y: 0 },
            parentId: id,
            extent: "parent" as const,
            data: { label: "No", category: "condition-no" },
          });
          const childResult = parseActions(action.else.actions, id, `${scopedName}.no`);
          for (const entryId of childResult.entryIds) {
            edges.push({ id: `e_${noId}_${entryId}`, source: noId, target: entryId, type: "smoothstep" });
          }
        }
      }

      if (action.type === "Switch" && action.cases) {
        for (const [caseName, caseBody] of Object.entries(action.cases)) {
          if (caseBody.actions && Object.keys(caseBody.actions).length > 0) {
            const caseId = nextId("case");
            nodes.push({
              id: caseId,
              type: "flowBranch",
              position: { x: 0, y: 0 },
              parentId: id,
              extent: "parent" as const,
              data: { label: caseName, category: "condition-case" },
            });
            const childResult = parseActions(caseBody.actions, id, `${scopedName}.${caseName}`);
            for (const entryId of childResult.entryIds) {
              edges.push({ id: `e_${caseId}_${entryId}`, source: caseId, target: entryId, type: "smoothstep" });
            }
          }
        }
      }
    }

    // Create edges from runAfter dependencies
    for (const [name, action] of actionEntries) {
      const targetId = nameToId.get(name)!;
      const runAfterMap = action.runAfter || {};
      const deps = Object.keys(runAfterMap).filter((d) => allNames.has(d));
      for (const dep of deps) {
        const sourceId = nameToId.get(dep)!;
        const conditions = runAfterMap[dep] || ["Succeeded"];
        const isErrorPath = !conditions.every((c) => c === "Succeeded");
        edges.push({
          id: `e_${sourceId}_${targetId}`,
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          ...(isErrorPath ? {
            label: conditions.map((c) => c.toLowerCase()).join("/"),
            labelStyle: { fontSize: 9, fill: "#ef4444", fontWeight: 600 },
            labelBgStyle: { fill: "rgba(255,255,255,0.85)" },
            labelBgPadding: [2, 4] as [number, number],
            labelShowBg: true,
            style: { stroke: "#ef4444", strokeDasharray: "4 2", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#ef4444" },
          } : {}),
        });
      }
    }

    const entryIds = entryNames.map((n) => nameToId.get(n)!);
    const exitIds = exitNames.map((n) => nameToId.get(n)!);
    return { entryIds, exitIds };
  }

  const { entryIds } = parseActions(defn.actions);

  // Connect triggers to entry actions
  for (const triggerId of triggerIds) {
    for (const entryId of entryIds) {
      edges.push({
        id: `e_${triggerId}_${entryId}`,
        source: triggerId,
        target: entryId,
        type: "smoothstep",
      });
    }
  }

  return { nodes, edges };
}

// ── ELK layout helper ─────────────────────────────────────────────

interface ElkNode {
  id: string;
  width: number;
  height: number;
  children?: ElkNode[];
  edges?: ElkEdge[];
  layoutOptions?: Record<string, string>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ElkGraph {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNode[];
  edges: ElkEdge[];
}

const NODE_WIDTH = 320;
const BRANCH_HEIGHT = 28;        // Yes/No/Case branch labels
const GROUP_PADDING = 60;

// Estimate how many rows a string occupies at a given character-per-row budget
function estimateRows(text: string, charsPerRow: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerRow));
}

function getNodeHeight(node: Node): number {
  if (node.type === "flowBranch") return BRANCH_HEIGHT;
  const label = (node.data?.label as string | undefined) ?? "";
  const detail = node.data?.detail as string | undefined;
  const desc = node.data?.description as string | undefined;
  const subLineCount = (node.data?.subLines as string[] | undefined)?.length ?? 0;

  // Approximate char-per-row for each text size at ~280px usable node width
  const labelH  = estimateRows(label, 34) * 18;          // text-xs, ~34 chars/row
  const detailH = detail ? estimateRows(detail, 42) * 14 + 2 : 0;  // text-[10px]
  const subH    = subLineCount * 16;                      // text-[9px] mono, one per row
  const descH   = desc ? estimateRows(desc, 46) * 14 + 2 : 0;     // text-[9px] italic

  return 16 + labelH + detailH + subH + descH + 8; // 16px top pad + content + 8px bottom pad
}

export function buildElkGraph(nodes: Node[], edges: Edge[]): ElkGraph {
  // Build parent-child mapping
  const childrenMap = new Map<string | undefined, Node[]>();
  for (const node of nodes) {
    const parentId = node.parentId;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(node);
  }

  function buildElkNode(node: Node): ElkNode {
    const children = childrenMap.get(node.id) || [];
    const isContainer = node.data?.isContainer || children.length > 0;
    const nodeHeight = getNodeHeight(node);

    const elkNode: ElkNode = {
      id: node.id,
      width: isContainer ? NODE_WIDTH + GROUP_PADDING * 2 : (node.type === "flowBranch" ? 80 : NODE_WIDTH),
      height: isContainer ? nodeHeight + GROUP_PADDING : nodeHeight,
    };

    if (children.length > 0) {
      elkNode.children = children.map(buildElkNode);
      elkNode.layoutOptions = {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "20",
        "elk.layered.spacing.nodeNodeBetweenLayers": "30",
        "elk.padding": `[top=${GROUP_PADDING},left=20,bottom=20,right=20]`,
      };
    }

    return elkNode;
  }

  // Build top-level ELK nodes
  const topLevelNodes = childrenMap.get(undefined) || [];

  // Build parent lookup so we can place edges at the correct hierarchy level
  const parentOf = new Map<string, string | undefined>();
  for (const node of nodes) {
    parentOf.set(node.id, node.parentId);
  }

  // Find the lowest common ancestor for an edge's source and target.
  // Edges must be placed at the level of their LCA in the ELK hierarchy.
  // "undefined" means root level.
  function findEdgeOwner(sourceId: string, targetId: string): string | undefined {
    // Get ancestor chains
    const sourceAncestors: (string | undefined)[] = [];
    let s: string | undefined = sourceId;
    while (s !== undefined) {
      sourceAncestors.push(s);
      s = parentOf.get(s);
    }
    sourceAncestors.push(undefined); // root

    const sourceSet = new Set(sourceAncestors);

    let t: string | undefined = targetId;
    while (t !== undefined) {
      if (sourceSet.has(t)) return t === sourceId || t === targetId ? parentOf.get(t) : t;
      t = parentOf.get(t);
    }
    // Root level
    return undefined;
  }

  // Group edges by their owner (the node whose ELK children array they belong to)
  const edgesByOwner = new Map<string | undefined, ElkEdge[]>();
  for (const e of edges) {
    const owner = findEdgeOwner(e.source, e.target);
    if (!edgesByOwner.has(owner)) edgesByOwner.set(owner, []);
    edgesByOwner.get(owner)!.push({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    });
  }

  // Attach edges to their owner nodes in the ELK tree
  function attachEdges(elkNode: ElkNode): void {
    const nodeEdges = edgesByOwner.get(elkNode.id);
    if (nodeEdges && nodeEdges.length > 0) {
      elkNode.edges = nodeEdges;
    }
    if (elkNode.children) {
      for (const child of elkNode.children) {
        attachEdges(child);
      }
    }
  }

  const elkChildren = topLevelNodes.map(buildElkNode);
  for (const child of elkChildren) {
    attachEdges(child);
  }

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "30",
      "elk.layered.spacing.nodeNodeBetweenLayers": "45",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.mergeEdges": "true",
    },
    children: elkChildren,
    edges: edgesByOwner.get(undefined)?.map((e) => e) || [],
  };
}

// Apply ELK positions back to React Flow nodes
export function applyElkLayout(
  nodes: Node[],
  elkResult: { children?: Array<{ id: string; x: number; y: number; width: number; height: number; children?: unknown[] }> }
): Node[] {
  const positionMap = new Map<string, { x: number; y: number; width: number; height: number }>();

  function extractPositions(elkNodes: Array<{ id: string; x: number; y: number; width: number; height: number; children?: unknown[] }>) {
    for (const elkNode of elkNodes) {
      positionMap.set(elkNode.id, {
        x: elkNode.x,
        y: elkNode.y,
        width: elkNode.width,
        height: elkNode.height,
      });
      if (elkNode.children && Array.isArray(elkNode.children)) {
        extractPositions(elkNode.children as Array<{ id: string; x: number; y: number; width: number; height: number; children?: unknown[] }>);
      }
    }
  }

  if (elkResult.children) {
    extractPositions(elkResult.children);
  }

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (!pos) return node;

    const isContainer = node.data?.isContainer || (positionMap.has(node.id) && pos.width > NODE_WIDTH + 10);

    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      ...(isContainer
        ? { style: { ...node.style, width: pos.width, height: pos.height } }
        : {}),
    };
  });
}
