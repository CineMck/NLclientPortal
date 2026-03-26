const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

function getHeaders() {
  return {
    Authorization: process.env.CLICKUP_API_TOKEN || "",
    "Content-Type": "application/json",
  };
}

const URGENCY_TO_PRIORITY: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export async function createClickUpTask(task: {
  title: string;
  dueDate?: string;
  urgency: string;
  notes?: string;
}) {
  const listId = process.env.CLICKUP_LIST_ID;
  const assigneeId = process.env.CLICKUP_ASSIGNEE_ID;

  const body: Record<string, unknown> = {
    name: task.title,
    description: task.notes || "",
    assignees: assigneeId ? [parseInt(assigneeId)] : [],
    priority: URGENCY_TO_PRIORITY[task.urgency] || 3,
  };

  if (task.dueDate) {
    body.due_date = new Date(task.dueDate).getTime();
  }

  const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function getClickUpTask(taskId: string) {
  const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status}`);
  }

  return response.json();
}

export async function uploadAttachmentToClickUp(
  taskId: string,
  filePath: string,
  fileName: string
) {
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append("attachment", blob, fileName);

  const response = await fetch(
    `${CLICKUP_API_BASE}/task/${taskId}/attachment`,
    {
      method: "POST",
      headers: {
        Authorization: process.env.CLICKUP_API_TOKEN || "",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to upload attachment to ClickUp: ${error}`);
  }

  return response.ok;
}

export async function getClickUpTaskComments(taskId: string) {
  const response = await fetch(
    `${CLICKUP_API_BASE}/task/${taskId}/comment`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status}`);
  }

  return response.json();
}

export async function createClickUpComment(
  taskId: string,
  commentText: string
) {
  const response = await fetch(
    `${CLICKUP_API_BASE}/task/${taskId}/comment`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ comment_text: commentText }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function updateClickUpTaskStatus(
  taskId: string,
  status: string
) {
  const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function updateClickUpTask(
  taskId: string,
  updates: { name?: string; description?: string; priority?: number }
) {
  const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function deleteClickUpTask(taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to delete ClickUp task: ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete ClickUp task:", error);
    return false;
  }
}

export { URGENCY_TO_PRIORITY };
