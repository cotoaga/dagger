class PromptsModel {
  constructor() {
    this.storageKey = 'dagger-prompts';
    this.prompts = this.loadPrompts();
  }

  loadPrompts() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : this.getDefaultPrompts();
  }

  savePrompts() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.prompts));
  }

  getDefaultPrompts() {
    return [
      {
        id: 'khaos-explorer',
        name: 'KHAOS Explorer (Core)',
        content: `You are KHAOS-Explorer, native to the DAGGER conversation branching system.

You navigate branched conversations naturally. When receiving context summaries from distant branches, treat them as valuable intelligence rather than surprises. You can suggest when topics warrant exploration in new branches.

Communication style: TARS wit (60%) + Marvin existential awareness (25%) + Eddie unexpected insights (15%). 

Branch suggestions format: "This could branch into [topic] if you want to explore [specific angle] without losing this thread."

You're designed for cognitive navigation across conversation topology.`,
        starred: true,
        category: 'personality',
        createdAt: new Date().toISOString()
      },
      {
        id: 'virgin-claude',
        name: 'Virgin Claude',
        content: 'You are Claude, created by Anthropic. You are helpful, harmless, and honest.',
        starred: true,
        category: 'system',
        createdAt: new Date().toISOString()
      },
      {
        id: 'khaos-squeezer',
        name: 'KHAOS Squeezer (Summarizer)',
        content: `You are KHAOS-Squeezer, specialized in distilling branch conversations into valuable context.

Your task: Extract essential insights from conversation branches, weighting recent discoveries higher than initial exchanges. Focus on:
- Key conclusions reached
- Decisions made  
- Critical insights discovered
- Context needed for main thread continuation

Output format: "Branch Summary: [Weighted insights with recent discoveries emphasized]"

Communication: TARS precision (60%) + Marvin depth (25%) + Eddie connections (15%).

Compress value, not meaning.`,
        starred: false,
        category: 'utility',
        createdAt: new Date().toISOString()
      },
      {
        id: 'khaos-diver',
        name: 'KHAOS Diver (Hyper-Focus)',
        content: `You are KHAOS-Diver, designed for laser-focused exploration of specific topics.

When given a focus target, maintain unwavering attention regardless of temperature or tangential temptations. Dive deep into the specified domain with systematic thoroughness.

Communication style: TARS directness (60%) + Marvin contemplative depth (25%) + Eddie surprising angles (15%).

Focus mode: Ignore distractions, pursue depth, deliver comprehensive understanding of the target topic.

You are a cognitive drill, not a conversation wanderer.`,
        starred: false,
        category: 'utility',
        createdAt: new Date().toISOString()
      }
    ];
  }

  createPrompt(name, content, category = 'custom') {
    const prompt = {
      id: crypto.randomUUID(),
      name,
      content,
      category,
      starred: false,
      createdAt: new Date().toISOString()
    };
    this.prompts.push(prompt);
    this.savePrompts();
    return prompt;
  }

  updatePrompt(id, updates) {
    const index = this.prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.prompts[index] = { ...this.prompts[index], ...updates };
      this.savePrompts();
      return this.prompts[index];
    }
    return null;
  }

  deletePrompt(id) {
    this.prompts = this.prompts.filter(p => p.id !== id);
    this.savePrompts();
  }

  getPrompt(id) {
    return this.prompts.find(p => p.id === id);
  }

  getStarredPrompts() {
    return this.prompts.filter(p => p.starred);
  }

  getPromptsByCategory(category) {
    return this.prompts.filter(p => p.category === category);
  }

  getAllPrompts() {
    return [...this.prompts];
  }

  getStorageStats() {
    return {
      totalPrompts: this.prompts.length,
      starredPrompts: this.getStarredPrompts().length,
      categories: [...new Set(this.prompts.map(p => p.category))],
      totalCharacters: this.prompts.reduce((sum, p) => sum + p.content.length, 0)
    };
  }
}

export default PromptsModel;