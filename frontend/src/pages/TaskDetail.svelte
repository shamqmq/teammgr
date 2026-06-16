<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo, taskId } = $props();
  let task = $state(null);
  let dependencies = $state([]);
  let loading = $state(true);
  let error = $state('');
  let actionLoading = $state(false);

  async function loadTask() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Task not found');
      task = data.data || data.task;
      dependencies = task?.dependencies || [];
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(loadTask);

  async function updateStatus(newStatus) {
    actionLoading = true;
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update rejected.');
      await loadTask();
    } catch (err) {
      alert(err.message);
    } finally {
      actionLoading = false;
    }
  }

  let dependenciesMet = $derived(dependencies.length === 0 || dependencies.every(dep => dep.status === 'done'));
</script>

<main class="page">
  {#if loading}
    <div class="card text-center text-muted" style="padding: 3rem;">Loading task details...</div>
  {:else if error}
    <div class="card" style="padding: 2rem;">
      <div class="alert alert-error">{error}</div>
      <button onclick={() => goTo('dashboard')} class="btn btn-secondary mt-sm">← Back</button>
    </div>
  {:else if task}
    <div class="card">
      <div class="task-card-header" style="margin-bottom: 1.5rem;">
        <h1 style="margin: 0;">{task.title}</h1>
        <span class="badge badge-{task.status}">{task.status.replace('_', ' ')}</span>
      </div>

      <div class="flex flex-col gap-sm" style="margin-bottom: 1.5rem;">
        <div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">{task.description || 'No description provided.'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Priority</span>
          <span class="detail-value text-yellow">{task.priority}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">{task.due_to ? new Date(task.due_to).toLocaleDateString() : 'None'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Assigned To</span>
          <span class="detail-value">{task.assignedTo?.length ? task.assignedTo.map(u => u.name || u.email).join(', ') : 'Unassigned'}</span>
        </div>
      </div>

      {#if dependencies.length > 0}
        <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; background: var(--bg0_h); border-color: var(--bg2);">
          <h3 style="margin: 0 0 1rem 0; color: var(--blue);">Dependencies (Must be Done first)</h3>
          <div class="flex flex-col gap-sm">
            {#each dependencies as dep}
              <div class="flex justify-between items-center" style="padding: 0.75rem; background: var(--bg0); border-radius: var(--radius);">
                <button onclick={() => goTo('task-detail', dep.id)} class="table-link">{dep.title}</button>
                <span class="badge badge-{dep.status}">{dep.status.replace('_', ' ')}</span>
              </div>
            {/each}
          </div>
          {#if !dependenciesMet}
            <p class="text-yellow mt-sm" style="font-size: 0.9rem;">⚠️ Complete all dependencies before progressing.</p>
          {/if}
        </div>
      {/if}

      <div class="flex gap-sm">
        {#if task.status === 'todo'}
          <button disabled={actionLoading || !dependenciesMet} onclick={() => updateStatus('in_progress')} class="btn btn-primary">
            {actionLoading ? '...' : 'Start Task →'}
          </button>
        {:else if task.status === 'in_progress'}
          <button disabled={actionLoading || !dependenciesMet} onclick={() => updateStatus('done')} class="btn btn-success">
            {actionLoading ? '...' : 'Mark as Done ✓'}
          </button>
        {/if}

        {#if $auth.user?.role === 'admin'}
          <button onclick={() => goTo('edit-task', taskId)} class="btn btn-secondary">Edit Task</button>
        {/if}

        <button onclick={() => goTo('dashboard')} class="btn btn-secondary" style="margin-left: auto;">← Back</button>
      </div>
    </div>
  {/if}
</main>
