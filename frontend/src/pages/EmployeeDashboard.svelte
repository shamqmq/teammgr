<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();
  let tasks = $state([]);
  let loading = $state(true);
  let error = $state('');
  let actionLoadingId = $state(null);
  let page = $state(1);
  let totalPages = $state(1);
  let totalTasks = $state(0);
  const limit = 20;

  async function loadTasks() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      tasks = data.data || [];
      totalTasks = data.total || 0;
      totalPages = Math.ceil(totalTasks / limit) || 1;
    } catch (e) {
      error = e.message;
      tasks = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => { page; loadTasks(); });

  async function updateStatus(taskId, newStatus) {
    actionLoadingId = taskId;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status.');
      }
      tasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    } catch (e) {
      error = e.message;
    } finally {
      actionLoadingId = null;
    }
  }
</script>

<main class="page">
  <div class="page-header">
    <div>
      <h1>Welcome, {$auth.user?.name || $auth.user?.email || 'Employee'}</h1>
      <p class="text-muted">Role: <span class="text-blue font-bold">{$auth.user?.role}</span></p>
    </div>
    <div class="header-actions">
      <button onclick={() => goTo('request-task')} class="btn btn-success">+ Request Task</button>
      <button onclick={() => goTo('edit-profile')} class="btn btn-secondary">Edit Profile</button>
    </div>
  </div>

  {#if error}<div class="alert alert-error mb-sm">{error}</div>{/if}

  <h2 class="text-muted" style="margin-bottom: 1rem;">Your Assignments <span style="color: var(--fg0);">({totalTasks})</span></h2>

  {#if loading}
    <div class="card text-center text-muted" style="padding: 3rem;">Loading your tasks...</div>
  {:else if tasks.length === 0}
    <div class="card text-center" style="padding: 3rem;">
      <p class="text-muted mb-sm">You have no assigned tasks right now.</p>
      <button onclick={() => goTo('request-task')} class="btn btn-primary">Request Your First Task</button>
    </div>
  {:else}
    <div class="task-list">
      {#each tasks as task (task.id)}
        <div class="card task-card">
          <div class="task-card-header">
            <button onclick={() => goTo('task-detail', task.id)} class="task-title">{task.title}</button>
            <span class="badge badge-{task.status}">{task.status.replace('_', ' ')}</span>
          </div>
          <div class="task-meta">
            {#if task.due_to}<span>◷ Due {new Date(task.due_to).toLocaleDateString()}</span>{/if}
            {#if task.priority}<span>◆ {task.priority} priority</span>{/if}
          </div>
          <div class="task-actions">
            {#if task.status === 'todo'}
              <button disabled={actionLoadingId === task.id} onclick={() => updateStatus(task.id, 'in_progress')} class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                {actionLoadingId === task.id ? '...' : 'Start Task →'}
              </button>
            {:else if task.status === 'in_progress'}
              <button disabled={actionLoadingId === task.id} onclick={() => updateStatus(task.id, 'done')} class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                {actionLoadingId === task.id ? '...' : 'Mark Done ✓'}
              </button>
            {:else if task.status === 'done'}
              <span class="text-green" style="font-size: 0.85rem; font-weight: 700;">✓ Completed</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if totalPages > 1}
      <div class="pagination">
        <button disabled={page === 1} onclick={() => page--} class="btn btn-secondary" style="padding: 0.5rem 1rem;">← Prev</button>
        <span class="text-muted">Page <strong style="color: var(--fg0);">{page}</strong> of {totalPages}</span>
        <button disabled={page === totalPages} onclick={() => page++} class="btn btn-secondary" style="padding: 0.5rem 1rem;">Next →</button>
      </div>
    {/if}
  {/if}
</main>
