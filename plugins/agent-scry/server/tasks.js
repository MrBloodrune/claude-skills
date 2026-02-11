/**
 * Task and plan data extraction for enriching hook events.
 * Called by emit.js to attach structured task/plan info to SSE events.
 */

export function extractTaskData(toolName, toolInput, toolResponse) {
  if (!toolInput) toolInput = {};
  switch (toolName) {
    case 'TaskCreate':
      return {
        task_type: 'task_create',
        subject: toolInput.subject || '',
        description: toolInput.description || '',
        activeForm: toolInput.activeForm || '',
      };
    case 'TaskUpdate':
      return {
        task_type: 'task_update',
        taskId: toolInput.taskId || '',
        status: toolInput.status || null,
        owner: toolInput.owner || null,
        subject: toolInput.subject || null,
      };
    case 'TaskList':
      if (toolResponse) {
        const tasks = parseTaskListResponse(toolResponse);
        if (tasks) return { task_type: 'task_list', tasks };
      }
      return { task_type: 'task_list', tasks: [] };
    case 'TaskGet':
      if (toolResponse) {
        const task = parseTaskGetResponse(toolResponse);
        if (task) return { task_type: 'task_get', task };
      }
      return null;
    default:
      return null;
  }
}

export function extractPlanData(toolName, toolInput) {
  if (!toolInput) toolInput = {};
  switch (toolName) {
    case 'EnterPlanMode':
      return { plan_event: 'enter_plan_mode' };
    case 'ExitPlanMode':
      return { plan_event: 'exit_plan_mode' };
    case 'Write':
      if (toolInput.file_path && /plans\/.*\.md$/.test(toolInput.file_path)) {
        return {
          plan_event: 'plan_write',
          file_path: toolInput.file_path,
          content_preview: (toolInput.content || '').slice(0, 200),
        };
      }
      return null;
    default:
      return null;
  }
}

function parseTaskListResponse(resp) {
  if (typeof resp === 'string') {
    try { resp = JSON.parse(resp); } catch { return null; }
  }
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.tasks)) return resp.tasks;
  return null;
}

function parseTaskGetResponse(resp) {
  if (typeof resp === 'string') {
    try { resp = JSON.parse(resp); } catch { return null; }
  }
  if (resp && (resp.subject || resp.taskId || resp.id)) return resp;
  return null;
}
