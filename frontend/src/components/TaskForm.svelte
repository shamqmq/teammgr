<script>
  import { apiFetch } from '../lib/api';
  import SearchBox from '../components/SearchBox.svelte';

  let { taskId = null, goTo, initial = null, onSave, loading = false, error: externalError = '' } = $props();

  let title = $state(initial?.title || '');
  let description = $state(initial?.description || '');
  let status = $state(initial?.status || 'todo');
  let priority = $state(initial?.priority || 'medium');  // ← RESTORED
  let due_to = $state('');
  
  if (initial?.due_to) {
    due_to = new Date(initial.due_to).toISOString().split('T')[0];
  }

  let assignedUsers = $state(initial?.assignedTo || []);
  let dependencies = $state(initial?.dependencies || []);
  let error = $state(externalError);

  function addAssignee(user) {
    if (!assignedUsers.find(u => u.id === user.id)) {
      assignedUsers = [...assignedUsers, user];
    }
  }

  function removeAssignee(id) {
    assignedUsers = assignedUsers.filter(u => u.id !== id);
  }

  function addDependency(task) {
    if (!dependencies.find(d => d.id === task.id)) {
      dependencies = [...dependencies, task];
    }
  }

  function removeDependency(id) {
    dependencies = dependencies.filter(d => d.id !== id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    
    const payload = {
      title,
      description,
      status,
      priority,  // ← INCLUDED
      due_to: due_to ? new Date(due_to).toISOString() : null,
      assigned_to: assignedUsers.map(u => u.id),
      dependency_ids: dependencies.map(d => d.id)
    };

    onSave(payload);
  }
</script>

<main class="page-sm">
  <div class="card">
    <form onsubmit={handleSubmit} class="flex flex-col gap-sm">
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <div class="form-group">
        <label for="title">Title *</label>
        <input id="title" type="text" bind:value={title} required />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" bind:value={description} rows="4" placeholder="Describe the task requirements..."></textarea>
      </div>

      <!-- RESTORED: 3-column grid with priority -->
      <div class="flex gap-sm">
        <div class="form-group" style="flex: 1;">
          <label for="status">Status</label>
          <select id="status" bind:value={status}>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div class="form-group" style="flex: 1;">
          <label for="priority">Priority</label>
          <select id="priority" bind:value={priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div class="form-group" style="flex: 1;">
          <label for="due_to">Due Date</label>
          <input id="due_to" type="date" bind:value={due_to} />
        </div>
      </div>

      <div class="divider"></div>

      <div class="form-group">
        <label>Assign Employees ({assignedUsers.length})</label>
        <p class="text-muted" style="font-size: 0.8rem; margin: 0 0 0.5rem 0;">Search and add multiple employees.</p>
        <SearchBox endpoint="/api/users" placeholder="Search users..." onSelect={addAssignee} />
        
        {#if assignedUsers.length > 0}
          <ul class="flex flex-col gap-sm mt-sm" style="list-style: none; padding: 0;">
            {#each assignedUsers as user (user.id)}
              <li class="flex justify-between items-center" style="padding: 0.75rem; background: var(--bg1); border-radius: var(--radius);">
                <span style="font-weight: 600;">{user.name || user.email || user.id}</span>
                <button type="button" onclick={() => removeAssignee(user.id)} class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Remove</button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="divider"></div>

      <div class="form-group">
        <label>Task Dependencies</label>
        <p class="text-muted" style="font-size: 0.8rem; margin: 0 0 0.5rem 0;">Tasks that must be completed first.</p>
        <SearchBox endpoint="/api/tasks" placeholder="Search tasks..." onSelect={addDependency} />
        
        {#if dependencies.length > 0}
          <ul class="flex flex-col gap-sm mt-sm" style="list-style: none; padding: 0;">
            {#each dependencies as dep (dep.id)}
              <li class="flex justify-between items-center" style="padding: 0.75rem; background: var(--bg1); border-radius: var(--radius);">
                <span>{dep.title}</span>
                <button type="button" onclick={() => removeDependency(dep.id)} class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Remove</button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="flex gap-sm mt-sm" style="justify-content: flex-end;">
        <button type="button" onclick={() => goTo('admin-dashboard')} class="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} class="btn btn-primary">
          {loading ? 'Saving...' : (initial ? 'Update Task' : 'Create Task')}
        </button>
      </div>
    </form>
  </div>
</main>