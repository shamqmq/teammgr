<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let allTasks = $state([]);
  let users = $state([]);
  let loading = $state(true);
  let actionError = $state('');
  let taskSearch = $state('');

  let deleteTarget = $state(null);
  let showModal = $state(false);

  let requests = $derived(allTasks.filter(t => t.status === 'requested'));
  let activeTasks = $derived(allTasks.filter(t => t.status !== 'requested'));

  onMount(async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        apiFetch('/api/tasks?limit=100'),
        apiFetch('/api/users'),
      ]);
      if (!tasksRes.ok) throw new Error('Failed to load tasks');
      allTasks = (await tasksRes.json()).data || [];
      if (!usersRes.ok) throw new Error('Failed to load users');
      users = (await usersRes.json()).users || (await usersRes.json()).data || [];
    } catch (e) {
      actionError = e.message;
    } finally {
      loading = false;
    }
  });

  async function handleRequest(taskId, isApproved) {
    actionError = '';
    try {
      const newStatus = isApproved ? 'todo' : 'rejected';
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update request');
      allTasks = allTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    } catch (e) {
      actionError = e.message;
    }
  }

  function openDelete(type, id, name) {
    deleteTarget = { type, id, name };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    deleteTarget = null;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'task') {
        const res = await apiFetch(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete task');
        allTasks = allTasks.filter(t => t.id !== deleteTarget.id);
      } else {
        const res = await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
        users = users.filter(u => u.id !== deleteTarget.id);
      }
    } catch (e) {
      actionError = e.message;
    } finally {
      closeModal();
    }
  }

  function getRequesterName(req) {
    if (req.createdBy) return req.createdBy.name || req.createdBy.email;
    if (req.user) return req.user.name || req.user.email;
    if (req.requested_by) {
      const u = users.find(user => user.id === req.requested_by);
      return u?.name || u?.email || 'Unknown';
    }
    return 'Unknown';
  }
</script>

<main class="page">
  <div class="page-header">
    <div>
      <h1>Admin Control Center</h1>
      <p class="text-muted">Admin: <span class="text-blue font-bold">{$auth.user?.name || $auth.user?.email}</span></p>
    </div>
    <button onclick={() => goTo('add-task')} class="btn btn-primary">+ Create Task</button>
  </div>

  {#if actionError}<div class="alert alert-error mb-sm">{actionError}</div>{/if}

  {#if loading}
    <div class="card text-center text-muted" style="padding: 3rem;">Loading dashboard...</div>
  {:else}
    <section class="mb-sm">
      <h2><span class="text-yellow">◉</span> Pending Requests <span class="badge badge-requested">{requests.length}</span></h2>
      {#if requests.length === 0}
        <div class="card text-muted" style="padding: 1.5rem;">No pending requests at this time.</div>
      {:else}
        <div class="request-grid">
          {#each requests as req (req.id)}
            <div class="card request-card">
              <div class="task-card-header">
                <h3 style="margin: 0; font-size: 1.05rem;">{req.title}</h3>
                <span class="badge badge-requested">requested</span>
              </div>
              {#if req.description}
                <p class="text-muted" style="font-size: 0.9rem; line-height: 1.5; margin: 0.5rem 0;">{req.description}</p>
              {/if}
              <div class="request-meta">
                {#if req.priority}<span>◆ Priority: {req.priority}</span>{/if}
                {#if req.due_to}<span>◷ Due: {new Date(req.due_to).toLocaleDateString()}</span>{/if}
                <span>◎ By: {getRequesterName(req)}</span>
              </div>
              <div class="request-actions">
                <button onclick={() => goTo('task-detail', req.id)} class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">View Details</button>
                <div class="flex gap-sm">
                  <button onclick={() => handleRequest(req.id, true)} class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.85rem;">✓ Approve</button>
                  <button onclick={() => handleRequest(req.id, false)} class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.85rem;">✕ Reject</button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <div class="divider"></div>

    <section class="mb-sm">
      <div class="flex justify-between items-center mb-sm" style="gap: 1rem; flex-wrap: wrap;">
        <h2 style="margin: 0;"><span class="text-blue">◈</span> Active Tasks <span class="badge badge-in_progress">{activeTasks.length}</span></h2>
        <div class="flex gap-sm" style="align-items: center;">
          <input type="text" bind:value={taskSearch} placeholder="Search active tasks..." style="max-width: 250px;" />
          {#if taskSearch}
            <button onclick={() => taskSearch = ''} class="btn btn-secondary btn-sm">Clear</button>
          {/if}
        </div>
      </div>

      {#if activeTasks.length === 0}
        <div class="card text-muted" style="padding: 1.5rem;">No active tasks in the system.</div>
      {:else}
        {@const filteredTasks = taskSearch ? activeTasks.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase())) : activeTasks}
        {#if filteredTasks.length === 0}
          <div class="card text-muted" style="padding: 1.5rem;">No tasks match "{taskSearch}".</div>
        {:else}
          <div class="task-table">
            {#each filteredTasks as task (task.id)}
              <div class="table-row">
                <div class="table-cell" style="flex: 2;">
                  <button onclick={() => goTo('task-detail', task.id)} class="table-link">{task.title}</button>
                </div>
                <div class="table-cell" style="flex: 1;">
                  <span class="badge badge-{task.status}">{task.status.replace('_', ' ')}</span>
                </div>
                <div class="table-cell" style="flex: 1; justify-content: flex-end; gap: 0.5rem;">
                  <button onclick={() => goTo('edit-task', task.id)} class="btn btn-secondary btn-sm">Edit</button>
                  <button onclick={() => openDelete('task', task.id, task.title)} class="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </section>

    <div class="divider"></div>

    <section>
      <h2><span class="text-purple">◎</span> System Users <span class="badge" style="background: var(--bg2); color: var(--purple);">{users.length}</span></h2>
      <div class="users-grid">
        {#each users as user (user.id)}
          <div class="card user-chip">
            <div class="user-chip-avatar">{user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 0.9rem;">{user.name || 'Unknown'}</div>
              <div class="text-muted" style="font-size: 0.8rem;">{user.email}</div>
            </div>
            <button onclick={() => openDelete('user', user.id, user.name || user.email)} class="btn btn-ghost btn-sm">Delete</button>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

{#if showModal}
  <div class="modal-overlay" onclick={closeModal}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-title">Delete {deleteTarget?.type === 'task' ? 'Task' : 'User'}</div>
      <div class="modal-text">
        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?<br>
        This action cannot be undone.
      </div>
      <div class="modal-actions">
        <button onclick={closeModal} class="btn btn-secondary">Cancel</button>
        <button onclick={confirmDelete} class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>
{/if}