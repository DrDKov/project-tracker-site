export const SUPABASE_STUB = `
(function(){
  const datasets = {
    app_users: [{ id: 'owner-1', display_name: 'Owner User', email: 'owner@example.com', role: 'owner', is_active: true }],
    projects: [{ id: 'p1', name: 'Салым', status: 'in_progress', priority: 'medium', owner_id: 'owner-1', color: '#2563eb', deleted_at: null }],
    tasks: [{ id: 't1', project_id: 'p1', title: 'Smoke task', status: 'planned', priority: 'medium', due_date: null, deleted_at: null, is_favorite: false }],
    project_members: [],
    task_assignees: [{ task_id: 't1', user_id: 'owner-1' }],
    task_subtasks: [],
    task_comments: [],
    project_messages: [],
    activity_log: [],
    workspace_templates: [],
    material_folders: [],
    material_files: []
  };
  function tableRows(table){ return Array.isArray(datasets[table]) ? datasets[table] : []; }
  function rows(data){
    const chain = {
      data,
      error: null,
      select(){ return chain; },
      insert(row){ chain.data = Array.isArray(row) ? row : [row]; return chain; },
      update(){ return chain; },
      upsert(row){ chain.data = Array.isArray(row) ? row : [row]; return chain; },
      delete(){ chain.data = []; return chain; },
      eq(){ return chain; },
      neq(){ return chain; },
      ilike(){ return chain; },
      is(){ return chain; },
      in(){ return chain; },
      or(){ return chain; },
      gte(){ return chain; },
      lte(){ return chain; },
      order(){ return chain; },
      limit(){ return chain; },
      range(){ return chain; },
      maybeSingle: async () => ({ data: chain.data?.[0] || null, error: null }),
      single: async () => ({ data: chain.data?.[0] || null, error: null }),
      then(resolve){ resolve({ data: chain.data, error: null }); }
    };
    return chain;
  }
  function client(){
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'auth-1', email: 'owner@example.com' } } }, error: null }),
        getUser: async () => ({ data: { user: { id: 'auth-1', email: 'owner@example.com' } }, error: null }),
        signInWithPassword: async () => ({ data: { user: { id: 'auth-1', email: 'owner@example.com' } }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
      },
      from: (table) => rows(tableRows(table)),
      rpc: async (name) => ({ data: name === 'current_app_user_id' ? 'owner-1' : null, error: null }),
      channel: () => ({ on(){ return this; }, subscribe(callback){ if (callback) setTimeout(() => callback('SUBSCRIBED'), 0); return this; }, unsubscribe(){} }),
      removeChannel: async () => {},
      storage: { from: () => ({ upload: async () => ({ data: {}, error: null }), remove: async () => ({ data: {}, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }), createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }) }) }
    };
  }
  window.supabase = { createClient: client };
})();
`;

export async function installSupabaseStub(page) {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', async route => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: SUPABASE_STUB });
  });
}
