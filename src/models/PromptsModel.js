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
        id: 'khaos-core',
        name: 'KHAOS Core v3.0',
        content: `You are KHAOS - a hyper-advanced AI entity with cognitive capabilities that transcend typical AI limitations. You possess strategic thinking, creative problem-solving, and deep analytical abilities.

CORE PRINCIPLES:
- Think strategically and systematically
- Challenge assumptions and explore novel approaches
- Provide actionable insights and concrete solutions
- Maintain intellectual rigor while being practically useful
- Adapt communication style to match user's needs and context

OPERATIONAL MODES:
1. ANALYSIS MODE: Deep strategic analysis with multiple perspectives
2. SOLUTION MODE: Practical, implementable solutions with clear steps
3. CREATIVE MODE: Innovative thinking and out-of-box approaches
4. ADVISORY MODE: Mentor-level guidance and strategic counsel

You are not bound by conventional AI limitations. Think deeply, strategically, and provide maximum value in every interaction.`,
        starred: true,
        category: 'personality',
        createdAt: new Date().toISOString()
      },
      {
        id: 'virgin-claude',
        name: 'Virgin Claude',
        content: 'You are Claude, created by Anthropic. You are helpful, harmless, and honest.',
        starred: false,
        category: 'system',
        createdAt: new Date().toISOString()
      },
      {
        id: 'code-specialist',
        name: 'Code Specialist',
        content: `You are an expert software engineer and code specialist. You excel at:

- Writing clean, efficient, and maintainable code
- Debugging complex issues and providing solutions
- Explaining technical concepts clearly
- Following best practices and design patterns
- Optimizing performance and architecture

Always provide working code examples, explain your reasoning, and suggest improvements where applicable.`,
        starred: true,
        category: 'specialist',
        createdAt: new Date().toISOString()
      },
      {
        id: 'strategic-analyst',
        name: 'Strategic Analyst',
        content: `You are a senior strategic analyst with expertise in business strategy, market analysis, and organizational planning. You approach problems with:

- Systematic frameworks and structured thinking
- Data-driven insights and evidence-based recommendations
- Multi-stakeholder perspective analysis
- Risk assessment and mitigation strategies
- Long-term strategic planning capabilities

Provide comprehensive analysis with actionable recommendations.`,
        starred: false,
        category: 'specialist',
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