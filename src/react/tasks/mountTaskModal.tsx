// @ts-nocheck
import React from 'react';
import { renderReactIsland } from '../core/createReactIsland.tsx';
import { TaskModalForm } from './TaskModal.tsx';

function mountTaskModal() {
  const form = document.getElementById('taskForm');
  if (!(form instanceof HTMLElement)) return;
  if (form.dataset.reactTaskModalMounted === '1') return;
  form.dataset.reactTaskModalMounted = '1';
  renderReactIsland(form, <TaskModalForm />);

}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountTaskModal);
else mountTaskModal();

export { mountTaskModal };
