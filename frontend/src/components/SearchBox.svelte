<script>
  import { apiFetch } from '../lib/api';

  // Svelte 5 Props: We pass in the endpoint to search, placeholder text, and what to do when clicked
  let { endpoint, placeholder, onSelect } = $props();

  let query = $state('');
  let results = $state([]);
  let isSearching = $state(false);

  async function handleSearch() {
    // Don't search if they haven't typed at least 2 letters
    if (query.trim().length < 2) {
      results = [];
      return;
    }

    isSearching = true;
    try {
      // This calls exactly what we built in Step 1!
      const res = await apiFetch(`${endpoint}?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Check if the API returned { users: [...] } or { data: [...] }
        results = data.users || data.data || [];
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      isSearching = false;
    }
  }

  function handlePick(item) {
    onSelect(item); // Send the selected item back to the parent page
    query = '';     // Clear the search box
    results = [];   // Hide the dropdown
  }
</script>

<div style="position: relative; width: 100%; margin-bottom: 1rem;">
  <input 
    type="text" 
    bind:value={query} 
    oninput={handleSearch} 
    placeholder={placeholder}
    style="width: 100%; padding: 0.5rem; box-sizing: border-box;"
  />

  {#if results.length > 0}
    <ul style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; z-index: 10;">
      {#each results as item (item.id)}
        <li>
          <button 
            type="button"
            onclick={() => handlePick(item)} 
            style="width: 100%; text-align: left; padding: 0.5rem; border: none; background: none; cursor: pointer; border-bottom: 1px solid #eee;"
          >
            {item.name || item.title} 
            <span style="color: gray; font-size: 0.8em;">({item.email || item.status})</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  
  {#if isSearching}
    <p style="font-size: 0.8rem; color: gray;">Searching...</p>
  {/if}
</div>
