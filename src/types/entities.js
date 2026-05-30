// @ts-check

/**
 * @typedef {'owner' | 'admin' | 'member' | 'viewer' | 'editor' | string} WorkspaceRole
 */

/**
 * @typedef {'todo' | 'doing' | 'done' | 'blocked' | string} TaskStatus
 */

/**
 * @typedef {'low' | 'medium' | 'high' | 'urgent' | string} TaskPriority
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string=} email
 */

/**
 * @typedef {Object} AppUser
 * @property {string} id
 * @property {string=} display_name
 * @property {string=} email
 * @property {WorkspaceRole=} role
 * @property {boolean=} is_active
 * @property {string=} created_at
 * @property {string=} updated_at
 * @property {string=} position
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string=} workspace_id
 * @property {string=} name
 * @property {string=} description
 * @property {string=} owner_id
 * @property {string=} color
 * @property {string=} status
 * @property {string=} created_at
 * @property {string=} updated_at
 * @property {string=} priority
 * @property {string|null=} start_date
 * @property {string|null=} deadline
 * @property {string=} next_step
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} ProjectMember
 * @property {string=} id
 * @property {string} project_id
 * @property {string} user_id
 * @property {WorkspaceRole=} access_role
 * @property {string=} created_at
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string=} project_id
 * @property {string=} title
 * @property {string=} description
 * @property {string=} notes
 * @property {TaskStatus=} status
 * @property {TaskPriority=} priority
 * @property {string|null=} assignee_id
 * @property {string[]=} assignee_ids
 * @property {string|null=} start_date
 * @property {string|null=} due_date
 * @property {string|null=} start_time
 * @property {string|null=} end_time
 * @property {number|null=} duration_minutes
 * @property {boolean=} is_all_day
 * @property {string|null=} recurrence_date
 * @property {number=} sort_order
 * @property {boolean=} is_favorite
 * @property {string|null=} recurrence_rule_id
 * @property {string|null=} completed_at
 * @property {string|null=} completed_by_id
 * @property {string|null=} completed_by
 * @property {string|null=} closed_by_id
 * @property {string|null=} updated_by
 * @property {string|null=} updated_by_id
 * @property {string=} created_at
 * @property {string=} updated_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} TaskAssignee
 * @property {string=} id
 * @property {string} task_id
 * @property {string} user_id
 * @property {string=} created_at
 */

/**
 * @typedef {Object} Subtask
 * @property {string} id
 * @property {string} task_id
 * @property {string=} title
 * @property {boolean=} is_done
 * @property {number=} sort_order
 * @property {string=} created_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} TaskComment
 * @property {string} id
 * @property {string} task_id
 * @property {string=} user_id
 * @property {string=} author_id
 * @property {string=} body
 * @property {string=} content
 * @property {string=} created_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} ProjectMessage
 * @property {string} id
 * @property {string} project_id
 * @property {string=} user_id
 * @property {string=} author_id
 * @property {string=} body
 * @property {string=} content
 * @property {Array<{name:string,url:string,type?:string,isImage?:boolean}>=} files
 * @property {string=} created_at
 * @property {string|null=} deleted_at
 */

/**
 * @typedef {Object} NotificationRecord
 * @property {string=} id
 * @property {string=} type
 * @property {string=} task_id
 * @property {string=} user_id
 * @property {string=} title
 * @property {string=} body
 * @property {string=} project
 * @property {string=} author
 * @property {boolean=} is_read
 * @property {string=} created_at
 */

/**
 * @typedef {Object} WorkspacePermissionSnapshot
 * @property {string|null} profileId
 * @property {string} role
 * @property {boolean} isOwner
 * @property {boolean} isAdmin
 * @property {boolean} canManageWorkspace
 * @property {boolean} canManageUsers
 * @property {boolean} canViewAudit
 * @property {boolean} canViewMaterials
 * @property {string[]} projectIds
 */

/**
 * @typedef {Object} AppState
 * @property {import('./entities.js').AuthUser|null=} user
 * @property {import('./entities.js').AppUser|null=} profile
 * @property {any=} sb
 * @property {string=} view
 * @property {import('./entities.js').Project[]=} projects
 * @property {import('./entities.js').Task[]=} tasks
 * @property {import('./entities.js').AppUser[]=} users
 * @property {import('./entities.js').ProjectMember[]=} members
 * @property {import('./entities.js').TaskAssignee[]=} assignees
 * @property {import('./entities.js').Subtask[]=} subtasks
 * @property {import('./entities.js').TaskComment[]=} taskComments
 * @property {import('./entities.js').ProjectMessage[]=} messages
 * @property {import('./entities.js').NotificationRecord[]=} notifications
 * @property {import('./entities.js').WorkspacePermissionSnapshot|null=} permissions
 * @property {Array<Record<string, any>>=} materialTemplates
 * @property {Array<Record<string, any>>=} materialFolders
 * @property {Array<Record<string, any>>=} materialFiles
 * @property {Array<Record<string, any>>=} logs
 * @property {any[]=} audit
 * @property {number=} renderTimer
 * @property {string=} renderReason
 * @property {string=} selectSignature
 * @property {string=} taskBoardMode
 * @property {boolean=} tasksShowDone
 * @property {string=} tasksWeekStart
 * @property {string=} tasksDateMode
 * @property {string=} tasksDateFrom
 * @property {string=} tasksDateTo
 * @property {boolean=} taskBoardDndReactStage5
 * @property {string|null=} dragTask
 * @property {boolean=} loading
 * @property {boolean=} tasksLoading
 * @property {string[]=} warnings
 * @property {string=} taskError
 * @property {string=} statusTitle
 * @property {string=} statusText
 * @property {Record<string, any>=} [key]
 */

export {};
