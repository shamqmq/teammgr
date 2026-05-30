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
        body: JSON.stringify({
          title,
          description,
          priority,
          due_to,
          status: 'requested',
        }),
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

<div>
  <h1>Request a New Task</h1>
  <form on:submit={handleSubmit}>
    <div>
      <label for="title">Title</label>
      <input id="title" type="text" bind:value={title} required />
    </div>
    <div>
      <label for="description">Description</label>
      <textarea id="description" bind:value={description} rows="4"></textarea>
    </div>
    <div>
      <label for="priority">Priority</label>
      <select id="priority" bind:value={priority}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div>
      <label for="due_date">Due date</label>
      <input id="due_date" type="date" bind:value={due_date} />
    </div>
    {#if error}
      <p style="color: red;">{error}</p>
    {/if}
    <div>
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Send Request'}
      </button>
      <button type="button" on:click={() => goTo('dashboard')}>Cancel</button>
    </div>
  </form>
</div>
