// @ts-check
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

export function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeCssId(value) {
  if (window.CSS && CSS.escape) return CSS.escape(String(value ?? ''));
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
