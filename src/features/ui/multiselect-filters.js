import { $, $$, onReady } from '../../core/dom.js';
import { escapeHtml } from '../../core/html.js';

const FILTER_IDS = [
  'projectStatusFilter', 'projectOwnerFilter', 'taskProjectFilter', 'taskAssigneeFilter',
  'timelineTypeFilter', 'timelineProjectFilter', 'timelineAssigneeFilter', 'timelineStatusFilter', 'timelinePriorityFilter'
];

if (!window.__MULTISELECT_FILTERS_FEATURE__) {
  window.__MULTISELECT_FILTERS_FEATURE__ = true;

  const optionValues = (select) => Array.from(select.options).filter((option) => option.selected).map((option) => option.value);
  const allOption = (select) => Array.from(select.options).find((option) => option.value === 'all');

  function visibleLabel(select) {
    const selectedOptions = Array.from(select.options).filter((option) => option.selected && option.value !== 'all');
    if (!selectedOptions.length || optionValues(select).includes('all')) return allOption(select)?.textContent || 'Все';
    if (selectedOptions.length === 1) return selectedOptions[0].textContent;
    return `${selectedOptions.length} выбрано`;
  }

  function notify(select) {
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function refresh(select) {
    const wrapper = select.__msWrapper;
    if (!wrapper) return;
    const label = wrapper.querySelector('.ms-filter-btn span');
    if (label) label.textContent = visibleLabel(select);
    wrapper.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const option = Array.from(select.options).find((item) => item.value === checkbox.value);
      checkbox.checked = Boolean(option?.selected);
    });
  }

  function setValues(select, values, shouldNotify = true) {
    const normalized = values.includes('all') || !values.length ? ['all'] : values.filter((value) => value !== 'all');
    Array.from(select.options).forEach((option) => { option.selected = normalized.includes(option.value); });
    if (shouldNotify) notify(select);
    refresh(select);
  }

  function rebuild(select) {
    const wrapper = select.__msWrapper;
    const menu = wrapper && wrapper.querySelector('.ms-list');
    if (!menu) return;

    menu.innerHTML = Array.from(select.options).map((option) => (
      `<label class="ms-row ${option.value === 'all' ? 'all' : ''}">` +
      `<input type="checkbox" value="${escapeHtml(option.value)}" ${option.selected ? 'checked' : ''}>` +
      `<span>${escapeHtml(option.textContent)}</span></label>`
    )).join('');

    menu.querySelectorAll('input').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        let values = Array.from(menu.querySelectorAll('input:checked')).map((input) => input.value);
        if (checkbox.value === 'all' && checkbox.checked) values = ['all'];
        else values = values.filter((value) => value !== 'all');
        setValues(select, values, true);
      });
    });
    refresh(select);
  }

  function enhance(select) {
    if (!select || select.__msEnhanced || !FILTER_IDS.includes(select.id)) return;

    select.__msEnhanced = true;
    select.multiple = true;
    select.size = 1;
    select.classList.add('ms-source');
    if (!optionValues(select).length) setValues(select, ['all'], false);

    const wrapper = document.createElement('div');
    wrapper.className = 'ms-filter';
    wrapper.innerHTML = '<button class="ms-filter-btn" type="button"><span></span></button><div class="ms-menu"><div class="ms-actions"><button type="button" data-ms="all">Все</button><button type="button" data-ms="none">Сброс</button></div><div class="ms-list"></div></div>';
    select.after(wrapper);
    select.__msWrapper = wrapper;

    wrapper.querySelector('.ms-filter-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      $$('.ms-filter.open').forEach((item) => { if (item !== wrapper) item.classList.remove('open'); });
      wrapper.classList.toggle('open');
    });
    wrapper.querySelector('[data-ms="all"]').addEventListener('click', (event) => { event.preventDefault(); setValues(select, ['all'], true); });
    wrapper.querySelector('[data-ms="none"]').addEventListener('click', (event) => { event.preventDefault(); setValues(select, ['all'], true); });

    new MutationObserver(() => rebuild(select)).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected'] });
    rebuild(select);
  }

  function scan() { FILTER_IDS.forEach((id) => enhance($(id))); }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.ms-filter')) $$('.ms-filter.open').forEach((item) => item.classList.remove('open'));
  });
  onReady(scan);
  setInterval(scan, 700);
  scan();
}
