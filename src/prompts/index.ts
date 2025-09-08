// Browser-compatible prompt registry for DAGGER XML-based prompts
// Since we're in a React app, we'll import XML files as text and parse them

interface PromptMetadata {
  id: string;
  name: string;
  version: string;
  category: 'personality' | 'system' | 'decommissioned';
  description: string;
  starred: boolean;
  isDefault: boolean;
  usage: 'branch' | 'merge';
  created: string;
  modified: string;
}

interface Prompt {
  metadata: PromptMetadata;
  systemPrompt: string;
  notes?: string;
}

// Import XML files as text strings (Vite will handle this)
import khaosNavigatorV7 from './personality/khaos-navigator-v7.xml?raw';
import khaosSpecialistV7 from './personality/khaos-specialist-v7.xml?raw';
import vanillaClaude from './personality/vanilla-claude.xml?raw';
import khaosSynthesizerV7 from './system/khaos-synthesizer-v7.xml?raw';
import khaosSqueezerV7 from './system/khaos-squeezer-v7.xml?raw';

class PromptRegistry {
  private prompts: Map<string, Prompt> = new Map();
  private loaded: boolean = false;

  constructor() {
    this.loadPrompts();
  }

  private loadPrompts() {
    if (this.loaded) return;

    const xmlFiles = [
      khaosNavigatorV7,
      khaosSpecialistV7,
      vanillaClaude,
      khaosSynthesizerV7,
      khaosSqueezerV7
    ];

    xmlFiles.forEach(xmlContent => {
      try {
        const prompt = this.parsePromptXML(xmlContent);
        if (prompt && prompt.metadata.category !== 'decommissioned') {
          this.prompts.set(prompt.metadata.id, prompt);
        }
      } catch (error) {
        console.error('Failed to parse prompt XML:', error);
      }
    });

    this.loaded = true;
    console.log(`🎭 Loaded ${this.prompts.size} prompts`);
  }

  private parsePromptXML(xmlContent: string): Prompt | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const errorNode = xmlDoc.querySelector('parsererror');
      if (errorNode) {
        throw new Error('XML parsing failed');
      }

      const promptElement = xmlDoc.querySelector('prompt');
      if (!promptElement) {
        throw new Error('No prompt element found');
      }

      const metadata = promptElement.querySelector('metadata');
      const systemPromptElement = promptElement.querySelector('systemPrompt');
      const notesElement = promptElement.querySelector('notes');

      if (!metadata || !systemPromptElement) {
        throw new Error('Missing required elements');
      }

      const getElementText = (parent: Element, tagName: string): string => {
        const element = parent.querySelector(tagName);
        return element ? element.textContent?.trim() || '' : '';
      };

      const getBooleanValue = (parent: Element, tagName: string): boolean => {
        return getElementText(parent, tagName) === 'true';
      };

      return {
        metadata: {
          id: getElementText(metadata, 'id'),
          name: getElementText(metadata, 'name'),
          version: getElementText(metadata, 'version'),
          category: getElementText(metadata, 'category') as 'personality' | 'system' | 'decommissioned',
          description: getElementText(metadata, 'description'),
          starred: getBooleanValue(metadata, 'starred'),
          isDefault: getBooleanValue(metadata, 'isDefault'),
          usage: getElementText(metadata, 'usage') as 'branch' | 'merge',
          created: getElementText(metadata, 'created'),
          modified: getElementText(metadata, 'modified')
        },
        systemPrompt: systemPromptElement.textContent?.trim() || '',
        notes: notesElement?.textContent?.trim()
      };
    } catch (error) {
      console.error('Failed to parse prompt XML:', error);
      return null;
    }
  }

  getPrompt(id: string): Prompt | undefined {
    return this.prompts.get(id);
  }

  getAllPrompts(): Prompt[] {
    return Array.from(this.prompts.values());
  }

  getBranchPrompts(): Prompt[] {
    return Array.from(this.prompts.values())
      .filter(p => p.metadata.usage === 'branch');
  }

  getMergePrompts(): Prompt[] {
    return Array.from(this.prompts.values())
      .filter(p => p.metadata.usage === 'merge');
  }

  getDefaultBranchPrompt(): Prompt | undefined {
    return Array.from(this.prompts.values())
      .find(p => p.metadata.usage === 'branch' && p.metadata.isDefault);
  }

  getDefaultMergePrompt(): Prompt | undefined {
    return Array.from(this.prompts.values())
      .find(p => p.metadata.usage === 'merge' && p.metadata.isDefault);
  }

  getStarredPrompts(): Prompt[] {
    return Array.from(this.prompts.values())
      .filter(p => p.metadata.starred);
  }

  getPromptsByCategory(category: 'personality' | 'system'): Prompt[] {
    return Array.from(this.prompts.values())
      .filter(p => p.metadata.category === category);
  }

  // Backwards compatibility - convert to legacy format expected by existing UI
  toLegacyFormat(): Array<{
    id: string;
    name: string;
    description: string;
    emoji: string;
    category: string;
    chars: number;
    lines: number;
    starred: boolean;
    content?: string;
  }> {
    return this.getBranchPrompts().map(prompt => ({
      id: prompt.metadata.id,
      name: prompt.metadata.name,
      description: prompt.metadata.description,
      emoji: this.getEmojiForPrompt(prompt.metadata.id),
      category: prompt.metadata.category,
      chars: prompt.systemPrompt.length,
      lines: prompt.systemPrompt.split('\n').length,
      starred: prompt.metadata.starred,
      content: prompt.systemPrompt
    }));
  }

  private getEmojiForPrompt(id: string): string {
    const emojiMap: Record<string, string> = {
      'khaos_navigator_v7': '🧭🎭',
      'khaos_specialist_v7': '🔍🤖',
      'vanilla_claude': '🌱',
      'khaos_synthesizer_v7': '🔮🤖',
      'khaos_squeezer_v7': '⚡🤖'
    };
    return emojiMap[id] || '🤖';
  }
}

// Export singleton instance
const promptRegistry = new PromptRegistry();
export default promptRegistry;