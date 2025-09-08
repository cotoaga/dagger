import { describe, test, expect } from 'vitest';
import promptRegistry from '../index.ts';

describe('Prompt Registry', () => {
  test('loads all active prompts', () => {
    const branchPrompts = promptRegistry.getBranchPrompts();
    const mergePrompts = promptRegistry.getMergePrompts();
    
    expect(branchPrompts.length).toBeGreaterThan(0);
    expect(mergePrompts.length).toBeGreaterThan(0);
    
    console.log('Branch prompts loaded:', branchPrompts.length);
    console.log('Merge prompts loaded:', mergePrompts.length);
  });
  
  test('identifies default prompts', () => {
    const defaultBranch = promptRegistry.getDefaultBranchPrompt();
    const defaultMerge = promptRegistry.getDefaultMergePrompt();
    
    expect(defaultBranch).toBeDefined();
    expect(defaultMerge).toBeDefined();
    expect(defaultBranch?.metadata.id).toBe('khaos_navigator_v7');
    expect(defaultMerge?.metadata.id).toBe('khaos_synthesizer_v7');
    
    console.log('Default branch prompt:', defaultBranch?.metadata.name);
    console.log('Default merge prompt:', defaultMerge?.metadata.name);
  });
  
  test('filters starred prompts', () => {
    const starred = promptRegistry.getStarredPrompts();
    const starredIds = starred.map(p => p.metadata.id);
    
    expect(starredIds).toContain('khaos_navigator_v7');
    expect(starredIds).toContain('khaos_synthesizer_v7');
    
    console.log('Starred prompts:', starredIds);
  });
  
  test('provides backwards compatibility format', () => {
    const legacyFormat = promptRegistry.toLegacyFormat();
    
    expect(Array.isArray(legacyFormat)).toBe(true);
    expect(legacyFormat.length).toBeGreaterThan(0);
    
    const firstPrompt = legacyFormat[0];
    expect(firstPrompt).toHaveProperty('id');
    expect(firstPrompt).toHaveProperty('name');
    expect(firstPrompt).toHaveProperty('description');
    expect(firstPrompt).toHaveProperty('emoji');
    expect(firstPrompt).toHaveProperty('chars');
    expect(firstPrompt).toHaveProperty('lines');
    expect(firstPrompt).toHaveProperty('starred');
    
    console.log('Legacy format sample:', {
      id: firstPrompt.id,
      name: firstPrompt.name,
      chars: firstPrompt.chars,
      lines: firstPrompt.lines
    });
  });

  test('can retrieve individual prompts by ID', () => {
    const navigator = promptRegistry.getPrompt('khaos_navigator_v7');
    const specialist = promptRegistry.getPrompt('khaos_specialist_v7');
    const claude = promptRegistry.getPrompt('vanilla_claude');
    
    expect(navigator).toBeDefined();
    expect(specialist).toBeDefined();
    expect(claude).toBeDefined();
    
    expect(navigator?.systemPrompt).toContain('KHAOS Navigator');
    expect(specialist?.systemPrompt).toContain('KHAOS Specialist');
    expect(claude?.systemPrompt).toContain('Claude, a helpful AI assistant');
    
    console.log('Individual prompt retrieval successful');
  });
  
  test('categorizes prompts correctly', () => {
    const personalities = promptRegistry.getPromptsByCategory('personality');
    const systems = promptRegistry.getPromptsByCategory('system');
    
    expect(personalities.length).toBeGreaterThanOrEqual(3); // Navigator, Specialist, Claude
    expect(systems.length).toBeGreaterThanOrEqual(2); // Synthesizer, Squeezer
    
    console.log('Personality prompts:', personalities.length);
    console.log('System prompts:', systems.length);
  });
});