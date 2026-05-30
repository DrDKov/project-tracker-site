import React from 'react';

export const LazyDashboardPage = React.lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
export const LazyTasksPage = React.lazy(() => import('../pages/TasksPage').then((module) => ({ default: module.TasksPage })));
export const LazyProjectsPage = React.lazy(() => import('../pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
export const LazyMaterialsPage = React.lazy(() => import('../pages/MaterialsPage').then((module) => ({ default: module.MaterialsPage })));
export const LazyTeamPage = React.lazy(() => import('../pages/TeamPage').then((module) => ({ default: module.TeamPage })));
export const LazyTimelinePage = React.lazy(() => import('../pages/TimelinePage').then((module) => ({ default: module.TimelinePage })));
export const LazyChatPage = React.lazy(() => import('../pages/ChatPage').then((module) => ({ default: module.ChatPage })));
export const LazyAuditPage = React.lazy(() => import('../pages/AuditPage').then((module) => ({ default: module.AuditPage })));
export const LazySettingsPage = React.lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
