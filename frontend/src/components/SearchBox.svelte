<script>
  import { apiFetch } from '../lib/api';

  let { endpoint, placeholder, onSelect } = $props();

  let query = $state('');
  let results = $state([]);
  let isSearching = $state(false);

  async function handleSearch() {
    if (query.trim().length < 2) {
      results = [];
      return;
    }

    isSearching = true;
    try {
      const res = await apiFetch(`${endpoint}?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        results = data.users || data.data || [];
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      isSearching = false;
    }
  }

  function handlePick(item) {
    onSelect(item);
    query = '';
    results = [];
  }
</script>

<div style="position: relative; width: 100%;">
  <input 
    type="text" 
    bind:value={query} 
    oninput={handleSearch} 
    placeholder={placeholder}
  />

  {#if results.length > 0}
    <ul class="search-dropdown" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; list-style: none; padding: 0.5rem; margin: 0; max-height: 220px; overflow-y: auto; z-index: 50; border-radius: var(--radius-md);">
      {#each results as item (item.id)}
        <li>
          <button 
            type="button"
            onclick={() => handlePick(item)} 
            style="width: 100%; text-align: left; padding: 0.6rem 0.75rem; border: none; background: none; cursor: pointer; border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;"
          >
            <span>{item.name || item.title}</span>
            <span style="color: var(--text-muted); font-size: 0.8em;">{item.email || item.status}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  
  {#if isSearching}
    <p style="font-size: 0.8rem; color: var(--accent-sky); margin-top: 0.5rem;">Searching...</p>
  {/if}
</div>
