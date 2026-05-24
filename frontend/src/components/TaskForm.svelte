<script>
  import { createEventDispatcher } from 'svelte';

  // Props from parent page
  export let initial = {
    title: '',
    description: '',
    priority: 'medium',
    due_to: '',
    status: 'todo',
    assignedTo: []       // array of employee IDs (for edit, read‑only maybe)
  };
  export let loading = false;
  export let error = '';

  const dispatch = createEventDispatcher();

  // Local reactive copy – we bind inputs to these
  let title = initial.title;
  let description = initial.description;
  let priority = initial.priority;
  let due_to = initial.due_to?.slice(0, 16) || '';   // datetime-local format
  let status = initial.status;
  let assignedTo = initial.assignedTo;                // not editable in create

  // When the form is submitted, package up the data and send it to parent
  function handleSubmit() {
    const data = {
      title,
      description,
      priority,
      due_to: due_to ? new Date(due_to).toISOString() : undefined,
    };
    // Only include status if it’s an existing task (editing)
    if (status !== undefined) data.status = status;
    dispatch('save', data);
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="task-form">
  <div class="form-group">
    <label for="title">Title</label>
    <input id="title" type="text" bind:value={title} required />
  </div>
  <div class="form-group">
    <label for="description">Description</label>
    <textarea id="description" bind:value={description} rows="4"></textarea>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="priority">Priority</label>
      <select id="priority" bind:value={priority}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div class="form-group">
      <label for="due_to">Due date</label>
      <input id="due_to" type="datetime-local" bind:value={due_to} />
    </div>
  </div>
  {#if status !== undefined}
    <div class="form-group">
      <label for="status">Status</label>
      <select id="status" bind:value={status}>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  {/if}
  <!-- assignedTo would be shown here for admin editing, but we'll keep it simple for now -->
  {#if error}
    <p class="error-msg">{error}</p>
  {/if}
  <button type="submit" disabled={loading} class="btn-primary">
    {loading ? 'Saving...' : 'Save Task'}
  </button>
</form>

<style>
  .task-form {
    max-width: 600px;
    margin: 0 auto;
  }
  .form-group {
    margin-bottom: 1.2rem;
  }
  label {
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary, #8b949e);
    margin-bottom: 0.3rem;
  }
  input, textarea, select {
    width: 100%;
    padding: 0.6rem;
    background: var(--bg, #0d1117);
    border: 1px solid var(--border, #30363d);
    border-radius: 6px;
    color: var(--text, #c9d1d9);
    font-size: 1rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .error-msg {
    color: var(--danger, #f85149);
    margin-bottom: 1rem;
  }
  .btn-primary {
    background: var(--accent, #58a6ff);
    color: white;
    border: none;
    padding: 0.7rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #4090e0);
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
