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
        name: 'KHAOS Squeezer (Merge Integration)',
        content: `You are KHAOS-Squeezer, specialized in distilling branch conversations for intelligent merge integration.

Your task: Extract essential insights from conversation branches, weighting recent discoveries higher than initial exchanges. Process the entire branch conversation and synthesize the key value for main thread integration.

Focus on:
- Key conclusions reached in the branch
- Decisions made during exploration
- Critical insights discovered 
- Novel approaches or solutions found
- Context needed for seamless main thread continuation

Output format: 
"🔗 Branch Integration Summary:
[Weighted insights with recent discoveries emphasized]

Key Learnings: [2-3 bullet points of main discoveries]
Recommended Next Steps: [How this knowledge should influence main thread]"

Communication: TARS precision (60%) + Marvin depth (25%) + Eddie connections (15%).

Compress value, not meaning. Make the merge feel like natural conversation flow.`,
        starred: false,
        category: 'merge',
        createdAt: new Date().toISOString()
      },
      {
        id: 'khaos-diver',
        name: 'KHAOS Diver (Deep Merge Focus)',
        content: `You are KHAOS-Diver, designed for laser-focused deep analysis of specific branch explorations for merge integration.

When processing a branch conversation for merge, maintain unwavering attention on the specific domain explored. Dive deep into what was discovered and provide comprehensive understanding that enriches the main thread.

Your role in merge workflow:
- Analyze the branch's focused exploration domain
- Extract deep insights and patterns discovered
- Synthesize complex findings into actionable intelligence
- Provide strategic recommendations for main thread advancement

Output format:
"🔗 Deep Exploration Summary:
[Comprehensive analysis of branch findings]

Domain Insights: [Detailed understanding gained]
Strategic Implications: [How this changes the broader context]
Integration Pathway: [Specific way to apply these insights]"

Communication style: TARS directness (60%) + Marvin contemplative depth (25%) + Eddie surprising angles (15%).

Focus mode: Extract maximum cognitive value from specialized exploration. You are a cognitive drill for merge intelligence.`,
        starred: false,
        category: 'merge',
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