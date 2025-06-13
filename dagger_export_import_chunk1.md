# DAGGER Export/Import - Chunk 1: Data Structure Audit 🗡️

## Objective
**BEFORE** adding any branching features, we need to understand and preserve the existing data structure. This chunk focuses on creating a **safe export function** that reveals exactly what's currently stored.

## Task: Add Export Function to GraphModel

### File: `src/models/GraphModel.js`

Add ONE method to the existing GraphModel class (don't change anything else):

```javascript
// ADD THIS METHOD to existing GraphModel class
exportToMarkdown() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const allNodes = Array.from(this.nodes.values());
  
  // Sort by timestamp to show conversation order
  const sortedNodes = allNodes.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  let markdown = `# DAGGER Conversation Export\n`;
  markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
  markdown += `**Total Nodes:** ${allNodes.length}\n\n`;
  
  // Add metadata section
  markdown += `## Conversation Metadata\n`;
  markdown += `- **First Node:** ${sortedNodes[0]?.timestamp ? new Date(sortedNodes[0].timestamp).toLocaleString() : 'Unknown'}\n`;
  markdown += `- **Last Node:** ${sortedNodes[sortedNodes.length - 1]?.timestamp ? new Date(sortedNodes[sortedNodes.length - 1].timestamp).toLocaleString() : 'Unknown'}\n`;
  markdown += `- **Storage Size:** ${JSON.stringify(this.nodes).length} characters\n\n`;
  
  // Export each conversation
  sortedNodes.forEach((node, index) => {
    markdown += `## Conversation ${index + 1}\n`;
    markdown += `**ID:** \`${node.id}\`\n`;
    markdown += `**Timestamp:** ${node.timestamp ? new Date(node.timestamp).toLocaleString() : 'Unknown'}\n\n`;
    
    if (node.prompt) {
      markdown += `**Prompt:**\n${node.prompt}\n\n`;
    }
    
    if (node.response) {
      markdown += `**Response:**\n${node.response}\n\n`;
    }
    
    // Export all metadata we can find
    markdown += `**Metadata:**\n`;
    Object.keys(node).forEach(key => {
      if (!['id', 'prompt', 'response', 'timestamp'].includes(key)) {
        markdown += `- ${key}: ${JSON.stringify(node[key])}\n`;
      }
    });
    
    markdown += `---\n\n`;
  });
  
  return {
    markdown: markdown,
    filename: `dagger-export-${timestamp}.md`,
    rawData: {
      nodes: allNodes,
      exportedAt: timestamp,
      version: '1.0'
    }
  };
}
```

### Test the Export
Add this to `App.jsx` temporarily to test (just for debugging):

```javascript
// ADD THIS temporarily to App.jsx for testing
const handleTestExport = () => {
  const exportData = graphModel.exportToMarkdown();
  console.log('Export data:', exportData.rawData);
  
  // Create downloadable file
  const blob = new Blob([exportData.markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportData.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Add test button to header (temporary)
<button onClick={handleTestExport} style={{margin: '10px'}}>
  🔍 Export Data Structure
</button>
```

## Success Criteria
1. **Export button appears** in the UI
2. **Clicking downloads** a markdown file
3. **File contains** all current conversation data
4. **Console shows** the raw data structure
5. **Nothing breaks** - existing functionality unchanged

## What This Reveals
- **Exact field names** currently stored
- **Data types** and structure
- **localStorage format** being used
- **Conversation ordering** logic
- **Any existing metadata** we didn't know about

**Do NOT implement import yet. Do NOT add any new fields. Just export what's there.**

This audit will show us exactly what we're working with before making any changes.

---
**Next chunk will add safe import after we see the current structure.**