const brand = {
  primary: "#2457a7",
  primaryDark: "#153d7d",
  success: "#2f7a55",
  danger: "#9c2f38",
  warning: "#946200",
  text: "#172033",
  muted: "#637083",
  line: "#dce4ef",
  soft: "#f5f7fb"
};

const dictionary = {
  ar: {
    automated: "هذه رسالة آلية من تطبيق To Do Task.",
    rights: "جميع الحقوق محفوظة ليحيى الشهراني",
    otpSubtitle: "التحقق من تسجيل الدخول",
    otpTitle: "رمز التحقق لتسجيل الدخول",
    otpDescription: "استخدم الرمز التالي لإكمال تسجيل الدخول إلى To Do Task.",
    otpExpires: "ينتهي هذا الرمز خلال 10 دقائق.",
    dailySubtitle: "التقرير اليومي",
    dailyTitle: "تقرير المهام الحالية",
    dailyDescription: "ملخص يومي للمهام غير المكتملة.",
    totalActive: "إجمالي المهام الحالية",
    highPriority: "المهام عالية الأولوية",
    overdueTasks: "المهام المتأخرة",
    activeTasks: "المهام الحالية",
    emptyActive: "لا توجد مهام حالية.",
    dueSubtitle: "تذكير بموعد التسليم",
    dueTitle: "تذكير: موعد تسليم قريب",
    dueDescription: "هذه المهمة مستحقة خلال {days}.",
    days3: "3 أيام",
    days2: "يومين",
    days1: "يوم واحد",
    overdueSubtitle: "تنبيه المهام المتأخرة",
    overdueTitle: "تنبيه: توجد مهام متأخرة",
    overdueDescription: "يرجى مراجعة المهام التالية واتخاذ الإجراء المناسب.",
    totalOverdue: "إجمالي المهام المتأخرة",
    daysOverdue: "أيام التأخير",
    completedSubtitle: "إنجاز مهمة",
    completedTitle: "تم إكمال المهمة بنجاح",
    completedDescription: "تم نقل المهمة إلى قسم المهام المكتملة.",
    task: "المهمة",
    title: "العنوان",
    description: "الوصف",
    priority: "الأولوية",
    status: "الحالة",
    dueDate: "تاريخ التسليم",
    completedAt: "تاريخ الإكمال",
    noDueDate: "بدون تاريخ تسليم",
    active: "نشطة",
    completed: "مكتملة",
    overdue: "متأخرة",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة"
  },
  en: {
    automated: "This is an automated message from To Do Task.",
    rights: "All rights reserved to Yahya Alshahrani",
    otpSubtitle: "OTP Verification",
    otpTitle: "Your login verification code",
    otpDescription: "Use the code below to complete your To Do Task sign in.",
    otpExpires: "This code expires in 10 minutes.",
    dailySubtitle: "Daily Report",
    dailyTitle: "Daily Active Tasks Report",
    dailyDescription: "A daily summary of your incomplete tasks.",
    totalActive: "Total Active Tasks",
    highPriority: "High Priority Tasks",
    overdueTasks: "Overdue Tasks",
    activeTasks: "Active Tasks",
    emptyActive: "There are no active tasks.",
    dueSubtitle: "Task Notification",
    dueTitle: "Reminder: Upcoming Task Deadline",
    dueDescription: "This task is due in {days}.",
    days3: "3 days",
    days2: "2 days",
    days1: "1 day",
    overdueSubtitle: "Overdue Alert",
    overdueTitle: "Overdue Tasks Alert",
    overdueDescription: "Please review the following overdue tasks and take action.",
    totalOverdue: "Total Overdue Tasks",
    daysOverdue: "Days Overdue",
    completedSubtitle: "Task Completed",
    completedTitle: "Task completed successfully",
    completedDescription: "The task has been moved to your completed tasks.",
    task: "Task",
    title: "Title",
    description: "Description",
    priority: "Priority",
    status: "Status",
    dueDate: "Due Date",
    completedAt: "Completed At",
    noDueDate: "No due date",
    active: "Active",
    completed: "Completed",
    overdue: "Overdue",
    high: "High",
    medium: "Medium",
    low: "Low"
  }
};

function normalizeLanguage(language) {
  return language === "en" ? "en" : "ar";
}

function tr(language, key) {
  const lang = normalizeLanguage(language);
  return dictionary[lang][key] || dictionary.en[key] || key;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function priorityLabel(language, priority) {
  return tr(language, priority || "medium");
}

function statusLabel(language, status) {
  return tr(language, status || "active");
}

function badge(label, tone = "neutral") {
  const tones = {
    high: ["#feeaea", brand.danger],
    medium: ["#fff3cf", brand.warning],
    low: ["#e9f6ef", brand.success],
    success: ["#e9f6ef", brand.success],
    danger: ["#f9e7e7", brand.danger],
    neutral: ["#eef3f9", brand.muted]
  };
  const [bg, color] = tones[tone] || tones.neutral;
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:700;">${escapeHtml(label)}</span>`;
}

function fieldRow(label, value) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 0;color:${brand.muted};font-size:13px;width:36%;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:${brand.text};font-size:14px;font-weight:700;">${value}</td>
    </tr>`;
}

function taskCard(language, task, index, extraRows = "") {
  const priority = task.priority || "medium";
  const tone = priority === "high" ? "high" : priority === "low" ? "low" : "medium";
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;border:1px solid ${brand.line};border-radius:16px;background:#ffffff;">
      <tr>
        <td style="padding:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:top;width:42px;">
                <div style="width:32px;height:32px;border-radius:12px;background:#eef3f9;color:${brand.primary};font-weight:800;text-align:center;line-height:32px;">${index + 1}</div>
              </td>
              <td style="vertical-align:top;">
                <div style="font-size:16px;font-weight:800;color:${brand.text};line-height:1.4;">${escapeHtml(task.title)}</div>
                ${task.description ? `<div style="margin-top:6px;color:${brand.muted};font-size:13px;line-height:1.6;">${escapeHtml(task.description)}</div>` : ""}
                <div style="margin-top:12px;">
                  ${badge(priorityLabel(language, priority), tone)}
                  ${task.status ? badge(statusLabel(language, task.status), task.status === "completed" ? "success" : "neutral") : ""}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border-top:1px solid ${brand.line};">
                  ${fieldRow(tr(language, "dueDate"), escapeHtml(formatDate(task.dueDate) || tr(language, "noDueDate")))}
                  ${extraRows}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function summaryCard(label, value, tone = brand.primary) {
  return `
    <td style="padding:6px;width:33.33%;">
      <div style="border:1px solid ${brand.line};border-radius:14px;background:#ffffff;padding:14px;text-align:center;">
        <div style="font-size:24px;line-height:1;font-weight:900;color:${tone};">${escapeHtml(value)}</div>
        <div style="margin-top:7px;font-size:12px;line-height:1.4;color:${brand.muted};font-weight:700;">${escapeHtml(label)}</div>
      </div>
    </td>`;
}

function baseTemplate({ language = "ar", subtitle, title, description, content }) {
  const lang = normalizeLanguage(language);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.soft};font-family:Segoe UI,Arial,sans-serif;color:${brand.text};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.soft};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid ${brand.line};">
            <tr>
              <td style="padding:26px;background:linear-gradient(135deg,${brand.primaryDark},${brand.primary} 60%,${brand.success});color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:56px;vertical-align:middle;">
                      <div style="width:46px;height:46px;border-radius:16px;background:rgba(255,255,255,.16);text-align:center;line-height:46px;font-size:25px;font-weight:900;">✓</div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:22px;font-weight:900;line-height:1.1;">To Do Task</div>
                      <div style="margin-top:5px;font-size:13px;opacity:.9;font-weight:700;">${escapeHtml(subtitle)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0;color:${brand.text};font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
                ${description ? `<p style="margin:10px 0 22px;color:${brand.muted};font-size:15px;line-height:1.7;">${escapeHtml(description)}</p>` : ""}
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f9fbfe;border-top:1px solid ${brand.line};text-align:center;color:${brand.muted};font-size:12px;line-height:1.7;">
                <div style="font-weight:800;color:${brand.text};">© ${year} ${escapeHtml(tr(lang, "rights"))}</div>
                <div>${escapeHtml(tr(lang, "automated"))}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderOtpEmail({ language = "ar", code }) {
  const content = `
    <div style="border:1px solid ${brand.line};border-radius:18px;background:#f8fbff;padding:22px;text-align:center;">
      <div style="font-size:34px;letter-spacing:8px;font-weight:900;color:${brand.primary};font-family:Consolas,Menlo,monospace;">${escapeHtml(code)}</div>
      <div style="margin-top:12px;color:${brand.muted};font-size:14px;font-weight:700;">${escapeHtml(tr(language, "otpExpires"))}</div>
    </div>`;
  return baseTemplate({
    language,
    subtitle: tr(language, "otpSubtitle"),
    title: tr(language, "otpTitle"),
    description: tr(language, "otpDescription"),
    content
  });
}

function renderDailyReportEmail({ language = "ar", tasks = [], counts }) {
  const taskList = tasks.length
    ? tasks.map((task, index) => taskCard(language, task, index)).join("")
    : `<div style="border:1px dashed ${brand.line};border-radius:16px;background:#fbfdff;padding:20px;color:${brand.muted};font-weight:700;text-align:center;">${escapeHtml(tr(language, "emptyActive"))}</div>`;
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 -6px 20px;">
      <tr>
        ${summaryCard(tr(language, "totalActive"), String(counts.total), brand.primary)}
        ${summaryCard(tr(language, "highPriority"), String(counts.high), brand.warning)}
        ${summaryCard(tr(language, "overdueTasks"), String(counts.overdue), brand.danger)}
      </tr>
    </table>
    <h2 style="margin:0 0 12px;font-size:18px;color:${brand.text};">${escapeHtml(tr(language, "activeTasks"))}</h2>
    ${taskList}`;
  return baseTemplate({
    language,
    subtitle: tr(language, "dailySubtitle"),
    title: tr(language, "dailyTitle"),
    description: tr(language, "dailyDescription"),
    content
  });
}

function renderDueReminderEmail({ language = "ar", task, days }) {
  const daysLabel = tr(language, `days${days}`);
  const content = `
    <div style="margin-bottom:16px;">${badge(daysLabel, days === 1 ? "danger" : "medium")}</div>
    ${taskCard(language, task, 0)}`;
  return baseTemplate({
    language,
    subtitle: tr(language, "dueSubtitle"),
    title: tr(language, "dueTitle"),
    description: tr(language, "dueDescription").replace("{days}", daysLabel),
    content
  });
}

function renderOverdueAlertEmail({ language = "ar", tasks = [] }) {
  const content = `
    <div style="border:1px solid #f0cccc;border-radius:16px;background:#fff7f7;padding:16px;margin-bottom:18px;">
      <div style="font-size:14px;color:${brand.danger};font-weight:800;">${escapeHtml(tr(language, "totalOverdue"))}</div>
      <div style="margin-top:4px;font-size:30px;font-weight:900;color:${brand.danger};">${tasks.length}</div>
    </div>
    ${tasks.map((task, index) => {
      const extra = fieldRow(tr(language, "daysOverdue"), escapeHtml(String(task.daysOverdue || "")));
      return taskCard(language, { ...task, status: "overdue" }, index, extra);
    }).join("")}`;
  return baseTemplate({
    language,
    subtitle: tr(language, "overdueSubtitle"),
    title: tr(language, "overdueTitle"),
    description: tr(language, "overdueDescription"),
    content
  });
}

function renderTaskCompletedEmail({ language = "ar", task }) {
  const content = `
    <div style="text-align:center;margin-bottom:18px;">
      <div style="display:inline-block;width:58px;height:58px;border-radius:999px;background:#e9f6ef;color:${brand.success};line-height:58px;font-size:32px;font-weight:900;">✓</div>
    </div>
    ${taskCard(language, { ...task, status: "completed" }, 0, fieldRow(tr(language, "completedAt"), escapeHtml(formatDate(task.completedAt))))}`;
  return baseTemplate({
    language,
    subtitle: tr(language, "completedSubtitle"),
    title: tr(language, "completedTitle"),
    description: tr(language, "completedDescription"),
    content
  });
}

module.exports = {
  formatDate,
  priorityLabel,
  renderDailyReportEmail,
  renderDueReminderEmail,
  renderOtpEmail,
  renderOverdueAlertEmail,
  renderTaskCompletedEmail,
  statusLabel,
  tr
};
