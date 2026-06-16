<script>
  import { apiFetch } from '../lib/api';
  let { goTo } = $props();
  let title = $state('');
  let description = $state('');
  let priority = $state('medium');
  let due_date = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = '';
    try {
      const due_to = due_date ? new Date(due_date + 'T00:00:00Z').toISOString() : null;
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, priority, due_to, status: 'requested' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create request');
      goTo('dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<main class="page-sm">
  <div class="card">
    <header style="margin-bottom: 2rem;">
      <h1>Request a New Task</h1>
      <p class="text-muted">Submit a task idea for admin approval</p>
    </header>

    <form onsubmit={handleSubmit} class="flex flex-col gap-sm">
      {#if error}<div class="alert alert-error">{error}</div>{/if}

      <div class="form-group">
        <label for="title">Title</label>
        <input id="title" type="text" bind:value={title} required placeholder="What needs to be done?" />
      </div>
      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" bind:value={description} rows="4" placeholder="Describe the task in detail..."></textarea>
      </div>
      <div class="flex gap-sm">
        <div class="form-group" style="flex: 1;">
          <label for="priority">Priority</label>
          <select id="priority" bind:value={priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label for="due_date">Due Date</label>
          <input id="due_date" type="date" bind:value={due_date} />
        </div>
      </div>

      <div class="flex gap-sm mt-sm">
        <button type="button" onclick={() => goTo('dashboard')} class="btn btn-secondary" style="flex: 1;">Cancel</button>
        <button type="submit" disabled={loading} class="btn btn-primary" style="flex: 1;">{loading ? 'Submitting...' : 'Send Request'}</button>
      </div>
    </form>
  </div>
</main>
