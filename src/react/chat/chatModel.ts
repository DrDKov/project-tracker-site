// @ts-nocheck

/** @typedef {import('../../types/entities.js').Project} Project */
/** @typedef {import('../../types/entities.js').ProjectMessage} ProjectMessage */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

/**
 * @typedef {Object} ChatAttachment
 * @property {string} kind
 * @property {string} name
 * @property {string} url
 * @property {boolean} isImage
 */

/**
 * @typedef {Object} ChatMessageViewModel
 * @property {string} id
 * @property {string} projectId
 * @property {string} authorId
 * @property {string} authorLabel
 * @property {string} createdLabel
 * @property {boolean} mine
 * @property {string[]} textLines
 * @property {ChatAttachment[]} attachments
 * @property {string} searchableText
 */

/**
 * @typedef {Object} ChatProjectOption
 * @property {string} id
 * @property {string} name
 * @property {boolean} selected
 */

const ATTACHMENT_RE = /^(📎|🖼)\s+(.+?):\s+(https?:\/\/\S+)$/;

/** @param {unknown} value */
export function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * Parses the legacy chat body format that stores file references as text lines:
 * `📎 filename: https://...` or `🖼 image.png: https://...`.
 *
 * @param {string | null | undefined} body
 * @returns {{ textLines: string[], attachments: ChatAttachment[] }}
 */
export function parseChatBody(body) {
  const textLines = [];
  const attachments = [];

  String(body || '').split(/\n/).forEach((line) => {
    const match = line.match(ATTACHMENT_RE);
    if (match) {
      attachments.push({
        kind: match[1],
        name: match[2],
        url: match[3],
        isImage: match[1] === '🖼'
      });
      return;
    }
    textLines.push(line);
  });

  while (textLines.length && !textLines[0].trim()) textLines.shift();
  while (textLines.length && !textLines[textLines.length - 1].trim()) textLines.pop();

  return { textLines, attachments };
}

/**
 * @param {string | null | undefined} userId
 * @param {AppUser[]} users
 * @param {AppUser | null | undefined} profile
 */
export function getAuthorLabel(userId, users, profile) {
  const user = users.find((item) => item && item.id === userId);
  if (user) return user.display_name || user.email || 'Пользователь';
  if (profile && profile.id === userId) return profile.display_name || profile.email || 'Вы';
  return 'Пользователь';
}

/**
 * @param {Project[]} projects
 * @param {string | null | undefined} activeProjectId
 */
export function getActiveChatProjectId(projects, activeProjectId) {
  if (activeProjectId && projects.some((project) => project.id === activeProjectId)) return activeProjectId;
  return projects[0]?.id || '';
}

/**
 * @param {Project[]} projects
 * @param {string} activeProjectId
 * @returns {ChatProjectOption[]}
 */
export function createChatProjectOptions(projects, activeProjectId) {
  return projects
    .filter((project) => project && !project.deleted_at)
    .map((project) => ({
      id: project.id,
      name: project.name || 'Без названия',
      selected: project.id === activeProjectId
    }));
}

/**
 * @param {ProjectMessage} message
 * @param {{ users: AppUser[], profile?: AppUser | null, dateTime: (value?: string | null) => string }} options
 * @returns {ChatMessageViewModel}
 */
export function createChatMessageViewModel(message, options) {
  const body = message.body || message.content || '';
  const parsed = parseChatBody(body);
  const authorId = message.author_id || message.user_id || '';
  const authorLabel = getAuthorLabel(authorId, options.users, options.profile);
  const searchableText = [body, authorLabel].join(' ').toLowerCase();

  return {
    id: message.id,
    projectId: message.project_id,
    authorId,
    authorLabel,
    createdLabel: options.dateTime(message.created_at),
    mine: Boolean(options.profile?.id && authorId === options.profile.id),
    textLines: parsed.textLines,
    attachments: parsed.attachments,
    searchableText
  };
}

/**
 * @param {{
 *   projects: Project[],
 *   messages: ProjectMessage[],
 *   users: AppUser[],
 *   profile?: AppUser | null,
 *   activeProjectId?: string | null,
 *   search?: string,
 *   selectedFileCount?: number,
 *   dateTime: (value?: string | null) => string
 * }} input
 */
export function createChatViewModel(input) {
  const activeProjectId = getActiveChatProjectId(input.projects || [], input.activeProjectId || '');
  const search = normalizeText(input.search).toLowerCase();
  const messages = (input.messages || [])
    .filter((message) => message && !message.deleted_at && message.project_id === activeProjectId)
    .map((message) => createChatMessageViewModel(message, {
      users: input.users || [],
      profile: input.profile || null,
      dateTime: input.dateTime
    }))
    .filter((message) => !search || message.searchableText.includes(search));

  return {
    activeProjectId,
    search,
    projectOptions: createChatProjectOptions(input.projects || [], activeProjectId),
    messages,
    selectedFileCount: Math.max(0, Number(input.selectedFileCount || 0)),
    hasProjects: Boolean((input.projects || []).length),
    emptyText: activeProjectId ? 'Сообщений пока нет' : 'Сначала создайте проект, чтобы открыть чат',
    hintText: 'Файлы сохраняются в Supabase Storage bucket project-chat-files.'
  };
}
