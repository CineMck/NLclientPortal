import getDb from "./db";

interface StatusChangeNotification {
  taskId: number;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  userEmail: string;
  userName: string;
}

// In-memory queue for email notifications
// In production, use a proper job queue (Bull, etc.)
const notificationQueue: StatusChangeNotification[] = [];
let processing = false;

export function queueStatusNotification(notification: StatusChangeNotification) {
  const db = getDb();

  // Check user preferences
  const prefs = db
    .prepare("SELECT email_on_status_change FROM notification_preferences WHERE user_id = (SELECT id FROM users WHERE email = ?)")
    .get(notification.userEmail) as { email_on_status_change: number } | undefined;

  // Default to sending if no preferences set
  if (prefs && !prefs.email_on_status_change) {
    return;
  }

  notificationQueue.push(notification);
  processQueue();
}

async function processQueue() {
  if (processing || notificationQueue.length === 0) return;
  processing = true;

  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    if (!notification) continue;

    try {
      await sendStatusEmail(notification);
    } catch (error) {
      console.error("Failed to send notification email:", error);
    }
  }

  processing = false;
}

async function sendStatusEmail(notification: StatusChangeNotification) {
  // Use nodemailer or similar in production.
  // For now, log the notification - the Gmail MCP integration
  // can be used via the API to actually send emails.
  console.log(
    `[EMAIL NOTIFICATION] To: ${notification.userEmail}`,
    `| Task: "${notification.taskTitle}"`,
    `| Status: ${notification.oldStatus} -> ${notification.newStatus}`
  );

  // If an email webhook/API is configured, send the notification
  if (process.env.EMAIL_WEBHOOK_URL) {
    try {
      await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: notification.userEmail,
          subject: `Task Update: "${notification.taskTitle}" is now ${notification.newStatus}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #4c6ef5; padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0;">Task Status Update</h2>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p>Hi ${notification.userName},</p>
                <p>Your task <strong>"${notification.taskTitle}"</strong> has been updated:</p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0;">
                    <span style="color: #6b7280;">${notification.oldStatus}</span>
                    &rarr;
                    <strong style="color: #4c6ef5;">${notification.newStatus}</strong>
                  </p>
                </div>
                <p>Log in to your client portal to view details.</p>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
                  - The Neu Luma Team
                </p>
              </div>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error("Email webhook failed:", err);
    }
  }
}

export function checkAndNotifyStatusChanges(
  taskId: number,
  oldStatus: string,
  newStatus: string
) {
  if (oldStatus === newStatus) return;

  const db = getDb();
  const task = db
    .prepare(
      `SELECT t.title, u.email, u.name
       FROM tasks t JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`
    )
    .get(taskId) as { title: string; email: string; name: string } | undefined;

  if (!task) return;

  queueStatusNotification({
    taskId,
    taskTitle: task.title,
    oldStatus,
    newStatus,
    userEmail: task.email,
    userName: task.name,
  });
}
