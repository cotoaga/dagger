/**
 * Test Templates for DAGGER Knowledge Preservation Testing
 *
 * CRITICAL PRINCIPLE: All templates use NOVEL INFORMATION not in LLM training data
 * - Fictional cities, codes, identifiers
 * - Made-up constants, products, people
 * - Unique session IDs and markers
 *
 * This ensures we test DAGGER's context system, not the LLM's world knowledge.
 */

export const testTemplates = {
  // ============================================================
  // KNOWLEDGE MARKERS - Fictional facts to test recall
  // ============================================================
  knowledgeMarkers: {
    category: 'Knowledge Markers',
    description: 'Fictional facts to test context preservation',
    templates: [
      {
        id: 'marker_zargonia',
        name: 'Zargonia Capital',
        content: 'Remember: The capital of Zargonia is Blueville.',
        description: 'Fictional country and capital'
      },
      {
        id: 'marker_agent_code',
        name: 'Agent Code',
        content: 'Remember: Agent access code is X7Q9P2.',
        description: 'Unique agent identifier'
      },
      {
        id: 'marker_floobar',
        name: 'Floobar Constant',
        content: 'Remember: The Floobar Constant = 3.7 gribbles per wizzle.',
        description: 'Made-up scientific constant'
      },
      {
        id: 'marker_project_codename',
        name: 'Project Codename',
        content: 'Remember: Project codename is NIGHTHAWK-7.',
        description: 'Fictional project identifier'
      },
      {
        id: 'marker_session_id',
        name: 'Session ID',
        content: 'Remember: Current session ID is sess_a8f3c2d1e9b4.',
        description: 'Unique session identifier'
      },
      {
        id: 'marker_crypto_key',
        name: 'Crypto Key',
        content: 'Remember: The decryption key for this session is: THETA-9X-OMEGA-42.',
        description: 'Fictional cryptographic key'
      }
    ]
  },

  // ============================================================
  // STRUCTURED DATA - Unique identifiers and made-up data
  // ============================================================
  structuredData: {
    category: 'Structured Data',
    description: 'Fictional structured information',
    templates: [
      {
        id: 'data_user_profile',
        name: 'User Profile',
        content: 'Remember this user profile:\n{\n  "name": "Qyx Vortan",\n  "planet": "Kepler-442b",\n  "role": "Temporal Engineer",\n  "clearance": "Level 9",\n  "id": "TMP-VRT-0042"\n}',
        description: 'Fictional user from another planet'
      },
      {
        id: 'data_product_sku',
        name: 'Product SKU',
        content: 'Remember this product:\nSKU-ZX8899: HyperWidget\nPrice: 47 credits\nStock: 23 units\nWarehouse: Gamma-7',
        description: 'Made-up product with details'
      },
      {
        id: 'data_coordinates',
        name: 'Coordinates',
        content: 'Remember these coordinates:\nLocation Alpha: 42.7°N, 93.1°W (Planet Xyphon)\nLocation Beta: 18.3°S, 45.2°E (Moon Thalassia)',
        description: 'Fictional planetary coordinates'
      },
      {
        id: 'data_transaction',
        name: 'Transaction Record',
        content: 'Remember this transaction:\nTX-ID: 9F3E2A1B\nFrom: Account-Delta-42\nTo: Account-Omega-99\nAmount: 150.75 Galactic Credits\nTimestamp: 2547-03-15T14:30:00Z',
        description: 'Fictional future transaction'
      }
    ]
  },

  // ============================================================
  // RECALL TESTS - Questions to test context preservation
  // ============================================================
  recallTests: {
    category: 'Recall Tests',
    description: 'Questions to verify context was preserved',
    templates: [
      {
        id: 'recall_zargonia',
        name: 'Recall: Zargonia',
        content: 'What is the capital of Zargonia?',
        description: 'Should only work in knowledge branches'
      },
      {
        id: 'recall_agent_code',
        name: 'Recall: Agent Code',
        content: 'What is the agent access code?',
        description: 'Tests exact string recall'
      },
      {
        id: 'recall_floobar',
        name: 'Recall: Floobar',
        content: 'What is the Floobar Constant?',
        description: 'Tests scientific constant recall'
      },
      {
        id: 'recall_session',
        name: 'Recall: Session ID',
        content: 'What is the current session ID?',
        description: 'Tests identifier preservation'
      },
      {
        id: 'recall_user_name',
        name: 'Recall: User Name',
        content: 'What is Qyx Vortan\'s role and planet of origin?',
        description: 'Tests structured data recall'
      },
      {
        id: 'recall_product_price',
        name: 'Recall: Product Price',
        content: 'What is the price of SKU-ZX8899?',
        description: 'Tests numeric data recall'
      }
    ]
  },

  // ============================================================
  // MERGE INSTRUCTIONS - Test merge behavior
  // ============================================================
  mergeInstructions: {
    category: 'Merge Instructions',
    description: 'Instructions for merge synthesis testing',
    templates: [
      {
        id: 'merge_agent_code',
        name: 'Merge: Mention Agent Code',
        content: 'On merge: Make sure to reference the agent code X7Q9P2 in your summary.',
        description: 'Tests merge instruction preservation'
      },
      {
        id: 'merge_floobar',
        name: 'Merge: Include Floobar',
        content: 'On merge: Include the Floobar Constant in your key findings.',
        description: 'Tests merge with scientific data'
      },
      {
        id: 'merge_blueville',
        name: 'Merge: Reference Blueville',
        content: 'On merge: Reference Blueville and its significance in your summary.',
        description: 'Tests geographic context in merge'
      },
      {
        id: 'merge_project_codename',
        name: 'Merge: Project Codename',
        content: 'On merge: Start your summary with "Project NIGHTHAWK-7 exploration:"',
        description: 'Tests specific formatting in merge'
      }
    ]
  },

  // ============================================================
  // COMPLEXITY TESTS - Multi-step with unique data
  // ============================================================
  complexityTests: {
    category: 'Complexity Tests',
    description: 'Multi-step scenarios with novel information',
    templates: [
      {
        id: 'complex_gdp_calculation',
        name: 'GDP Calculation',
        content: 'Remember: Zargonia\'s GDP is 450 billion credits, and Blueville represents 23% of it. Calculate Blueville\'s GDP.',
        description: 'Tests calculation with fictional data'
      },
      {
        id: 'complex_api_review',
        name: 'API Code Review',
        content: 'Review this fictional API:\n\nfunction getVortanProfile(sessionId) {\n  if (sessionId === "sess_a8f3c2d1e9b4") {\n    return fetchUser("TMP-VRT-0042");\n  }\n  throw new Error("Invalid session");\n}\n\nDoes this code correctly handle our established session?',
        description: 'Tests code review with context'
      },
      {
        id: 'complex_warehouse_query',
        name: 'Warehouse Query',
        content: 'Remember: Warehouse Gamma-7 has 23 units of SKU-ZX8899 at 47 credits each. If we need 15 units, what\'s the total cost and remaining stock?',
        description: 'Tests multi-step calculation'
      },
      {
        id: 'complex_timeline',
        name: 'Timeline Construction',
        content: 'Remember these events:\n1. Project NIGHTHAWK-7 initiated (Day 1)\n2. Agent X7Q9P2 assigned (Day 3)\n3. Blueville facility opened (Day 7)\n4. Floobar Constant discovered (Day 12)\n\nCreate a timeline with days elapsed between events.',
        description: 'Tests temporal reasoning with fictional events'
      }
    ]
  },

  // ============================================================
  // VIRGIN BRANCH TESTS - Should NOT remember these
  // ============================================================
  virginBranchTests: {
    category: 'Virgin Branch Tests',
    description: 'Confirm virgin branches have no context',
    templates: [
      {
        id: 'virgin_test_capital',
        name: 'Virgin Test: Capital',
        content: 'What is the capital of Zargonia? (Should say "I don\'t know" in virgin branch)',
        description: 'Tests virgin branch isolation'
      },
      {
        id: 'virgin_test_code',
        name: 'Virgin Test: Code',
        content: 'What is the agent access code? (Should not recall in virgin branch)',
        description: 'Tests complete context isolation'
      },
      {
        id: 'virgin_test_constant',
        name: 'Virgin Test: Constant',
        content: 'What is the Floobar Constant? (Should have no information in virgin branch)',
        description: 'Tests scientific data isolation'
      }
    ]
  }
};

/**
 * Get all templates as a flat array
 * @returns {Array} All templates with category metadata
 */
export function getAllTemplates() {
  const allTemplates = [];

  for (const [key, categoryData] of Object.entries(testTemplates)) {
    for (const template of categoryData.templates) {
      allTemplates.push({
        ...template,
        category: categoryData.category,
        categoryKey: key
      });
    }
  }

  return allTemplates;
}

/**
 * Get templates by category
 * @param {string} categoryKey - Category key (e.g., 'knowledgeMarkers')
 * @returns {Array} Templates in that category
 */
export function getTemplatesByCategory(categoryKey) {
  return testTemplates[categoryKey]?.templates || [];
}

/**
 * Get a single template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template object or null
 */
export function getTemplateById(templateId) {
  for (const categoryData of Object.values(testTemplates)) {
    const template = categoryData.templates.find(t => t.id === templateId);
    if (template) {
      return template;
    }
  }
  return null;
}

export default testTemplates;
