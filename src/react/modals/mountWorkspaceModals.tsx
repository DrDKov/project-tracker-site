// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { ProjectModal } from './ProjectModal.tsx';
import { UserModal } from './UserModal.tsx';
import { AccessModal } from './AccessModal.tsx';
import { createWorkspaceReactActions } from '../actions/workspaceActions.ts';

const api = {
  openProject: null,
  openUser: null,
  openAccess: null,
  refreshAccess: null
};

function app() {
  return {};
}

function getState() {
  return app().state || app().getState?.() || {};
}

function actions() {
  return createWorkspaceReactActions();
}

function closeDialog(id) {
  const node = document.getElementById(id);
  if (node instanceof HTMLDialogElement) node.close();
}

function mountProjectModal() {
  const form = document.getElementById('projectForm');
  const dialog = document.getElementById('projectModal');
  if (!(form instanceof HTMLElement)) return;
  if (form.dataset.reactControlledMounted === '1') return;
  form.dataset.reactControlledMounted = '1';
  renderReactIsland(form, (
    <ProjectModal
      dialog={dialog instanceof HTMLDialogElement ? dialog : null}
      getState={getState}
      actions={{
        saveProject: async (id, row) => {
          await actions().saveProjectData(id, row);
        }
      }}
      registerApi={(nextApi) => { api.openProject = nextApi.open; }}
    />
  ));
}

function mountUserModal() {
  const form = document.getElementById('userForm');
  const dialog = document.getElementById('userModal');
  if (!(form instanceof HTMLElement)) return;
  if (form.dataset.reactControlledMounted === '1') return;
  form.dataset.reactControlledMounted = '1';
  renderReactIsland(form, (
    <UserModal
      dialog={dialog instanceof HTMLDialogElement ? dialog : null}
      actions={{
        saveUser: async (id, row) => {
          await actions().saveUserData(id, row);
        }
      }}
      registerApi={(nextApi) => { api.openUser = nextApi.open; }}
    />
  ));
}

function mountAccessModal() {
  const form = document.getElementById('accessForm');
  const dialog = document.getElementById('accessModal');
  if (!(form instanceof HTMLElement)) return;
  if (form.dataset.reactControlledMounted === '1') return;
  form.dataset.reactControlledMounted = '1';
  renderReactIsland(form, (
    <AccessModal
      dialog={dialog instanceof HTMLDialogElement ? dialog : null}
      getState={getState}
      actions={{
        saveAccess: async (row) => {
          await actions().saveAccessData(row);
        },
        removeAccess: async (memberId) => {
          await actions().removeAccess(memberId);
        }
      }}
      registerApi={(nextApi) => { api.openAccess = nextApi.open; api.refreshAccess = nextApi.refresh; }}
    />
  ));
}

export function mountWorkspaceModals() {
  mountProjectModal();
  mountUserModal();
  mountAccessModal();
  window.addEventListener('workspace:access-sync', () => { api.refreshAccess?.(); });
  window.__ReactWorkspaceModals = {
    openProject(project, options) {
      if (typeof api.openProject !== 'function') mountProjectModal();
      api.openProject?.(project, options);
    },
    openUser(user) {
      if (typeof api.openUser !== 'function') mountUserModal();
      api.openUser?.(user);
    },
    openAccess(project) {
      if (typeof api.openAccess !== 'function') mountAccessModal();
      api.openAccess?.(project);
    },
    refreshAccess(projectId) {
      if (typeof api.refreshAccess !== 'function') mountAccessModal();
      api.refreshAccess?.(projectId);
    },
    close: closeDialog
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWorkspaceModals);
else mountWorkspaceModals();
