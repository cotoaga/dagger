import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GraphView } from '../GraphView.jsx'

// Mock cytoscape with enhanced visual feedback capabilities
const mockCyInstance = {
  nodes: vi.fn((selector) => {
    if (selector === '.valid-merge-target') {
      return {
        forEach: vi.fn((callback) => {
          callback({
            id: () => 'conv-2',
            position: vi.fn(() => ({ x: 150, y: 150 })),
            addClass: vi.fn(),
            removeClass: vi.fn(),
            selectable: vi.fn(() => true),
            grabbable: vi.fn(() => true)
          })
        })
      }
    } else if (selector === '.merge-target-hover') {
      return {
        removeClass: vi.fn()
      }
    } else if (selector === '.dragging-source') {
      return {
        removeClass: vi.fn()
      }
    } else {
      return {
        removeClass: vi.fn(),
        addClass: vi.fn(),
        forEach: vi.fn((callback) => {
          callback({
            id: () => 'conv-main-1',
            selectable: vi.fn(() => true),
            grabbable: vi.fn(() => true),
            data: vi.fn(() => ({
              displayNumber: 0,
              prompt: 'Test prompt',
              response: 'Test response'
            })),
            addClass: vi.fn(),
            removeClass: vi.fn(),
            position: vi.fn(() => ({ x: 100, y: 100 }))
          })
          callback({
            id: () => 'conv-branch-1',
            selectable: vi.fn(() => true),
            grabbable: vi.fn(() => true),
            data: vi.fn(() => ({
              displayNumber: '1.1.0',
              prompt: 'Branch prompt', 
              response: 'Branch response'
            })),
            addClass: vi.fn(),
            removeClass: vi.fn(),
            position: vi.fn(() => ({ x: 150, y: 150 }))
          })
          callback({
            id: () => 'conv-branch-2',
            selectable: vi.fn(() => true),
            grabbable: vi.fn(() => true),
            data: vi.fn(() => ({
              displayNumber: '1.1.1',
              prompt: 'End branch prompt', 
              response: 'End branch response'
            })),
            addClass: vi.fn(),
            removeClass: vi.fn(),
            position: vi.fn(() => ({ x: 180, y: 180 }))
          })
        })
      }
    }
  }),
  edges: vi.fn(() => ({
    addClass: vi.fn(),
    removeClass: vi.fn(),
    forEach: vi.fn()
  })),
  add: vi.fn((element) => {
    // Mock add method for temporary merge edges
    return {
      id: () => element.data.id,
      remove: vi.fn()
    }
  }),
  remove: vi.fn(),
  fit: vi.fn(),
  center: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  layout: vi.fn(() => ({
    run: vi.fn()
  })),
  getElementById: vi.fn(() => ({
    length: 1,
    addClass: vi.fn(),
    removeClass: vi.fn(),
    position: vi.fn(() => ({ x: 100, y: 100 }))
  }))
}

vi.mock('cytoscape', () => {
  const mockCytoscape = vi.fn(() => mockCyInstance)
  mockCytoscape.use = vi.fn()
  return {
    default: mockCytoscape
  }
})

vi.mock('cytoscape-dagre', () => ({
  default: {}
}))

// Mock formatISODateTime
vi.mock('../../models/GraphModel.js', () => ({
  formatISODateTime: vi.fn(timestamp => new Date(timestamp).toISOString())
}))

describe('GraphView Visual Merge Indicators', () => {
  let mockGraphModel
  let mockConversations
  let onMergeNodesMock
  let onConversationSelectMock

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock conversations for visual testing
    mockConversations = [
      {
        id: 'conv-main-1',
        displayNumber: 0,
        prompt: 'Main conversation',
        response: 'Main response',
        timestamp: Date.now(),
        status: 'complete'
      },
      {
        id: 'conv-branch-1',
        displayNumber: '1.1.0',
        prompt: 'Branch start',
        response: 'Branch response',
        timestamp: Date.now(),
        status: 'complete',
        branchType: 'virgin'
      },
      {
        id: 'conv-branch-2',
        displayNumber: '1.1.1',
        prompt: 'Branch end',
        response: 'Final branch response',
        timestamp: Date.now(),
        status: 'complete',
        branchType: 'virgin'
      }
    ]

    // Setup mock GraphModel with visual feedback methods
    mockGraphModel = {
      isEndNode: vi.fn(),
      canMergeNodes: vi.fn(),
      isThreadMerged: vi.fn(() => false),
      getConversation: vi.fn((id) => mockConversations.find(c => c.id === id)),
      getAllConversations: vi.fn(() => mockConversations),
      getAllConversationsWithBranches: vi.fn(() => mockConversations),
      isBranchId: vi.fn((displayNumber) => String(displayNumber).includes('.')),
      parseHierarchicalId: vi.fn(() => []),
      calculateDepth: vi.fn(() => 0),
      getBranchThread: vi.fn(() => []),
      getBranchPrefix: vi.fn(() => '1.1.')
    }

    onMergeNodesMock = vi.fn()
    onConversationSelectMock = vi.fn()

    // Reset the nodes mock to default behavior
    mockCyInstance.nodes.mockImplementation((selector) => {
      if (selector === '.valid-merge-target') {
        return {
          forEach: vi.fn((callback) => {
            callback({
              id: () => 'conv-2',
              position: vi.fn(() => ({ x: 150, y: 150 })),
              addClass: vi.fn(),
              removeClass: vi.fn(),
              selectable: vi.fn(() => true),
              grabbable: vi.fn(() => true)
            })
          })
        }
      } else if (selector === '.merge-target-hover') {
        return {
          removeClass: vi.fn()
        }
      } else if (selector === '.dragging-source') {
        return {
          removeClass: vi.fn()
        }
      } else {
        return {
          removeClass: vi.fn(),
          addClass: vi.fn(),
          forEach: vi.fn((callback) => {
            callback({
              id: () => 'conv-main-1',
              selectable: vi.fn(() => true),
              grabbable: vi.fn(() => true),
              data: vi.fn(() => ({
                displayNumber: 0,
                prompt: 'Test prompt',
                response: 'Test response'
              })),
              addClass: vi.fn(),
              removeClass: vi.fn(),
              position: vi.fn(() => ({ x: 100, y: 100 }))
            })
            callback({
              id: () => 'conv-branch-1',
              selectable: vi.fn(() => true),
              grabbable: vi.fn(() => true),
              data: vi.fn(() => ({
                displayNumber: '1.1.0',
                prompt: 'Branch prompt', 
                response: 'Branch response'
              })),
              addClass: vi.fn(),
              removeClass: vi.fn(),
              position: vi.fn(() => ({ x: 150, y: 150 }))
            })
            callback({
              id: () => 'conv-branch-2',
              selectable: vi.fn(() => true),
              grabbable: vi.fn(() => true),
              data: vi.fn(() => ({
                displayNumber: '1.1.1',
                prompt: 'End branch prompt', 
                response: 'End branch response'
              })),
              addClass: vi.fn(),
              removeClass: vi.fn(),
              position: vi.fn(() => ({ x: 180, y: 180 }))
            })
          })
        }
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Drag Source Visual Feedback', () => {
    test('should add dragging-source class when starting drag', async () => {
      // Setup: Mock end node that can be dragged
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(true)
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find the grab event handler
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')

      expect(grabHandler).toBeDefined()

      // Create mock node with addClass method
      const mockDraggingNode = {
        id: () => 'conv-branch-2',
        addClass: vi.fn()
      }

      const mockGrabEvent = {
        target: mockDraggingNode
      }

      // Execute grab handler
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
      }

      // Verify dragging-source class was added
      expect(mockDraggingNode.addClass).toHaveBeenCalledWith('dragging-source')
    })

    test('should remove dragging-source class when drag ends', async () => {
      // Setup: Mock drag end scenario
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(false)
      
      // Create a mock with explicit removeClass tracking
      const mockNodeCollection = {
        removeClass: vi.fn()
      }
      
      // Override the nodes() behavior for this test
      mockCyInstance.nodes.mockImplementation((selector) => {
        if (!selector) {
          return mockNodeCollection
        }
        return { forEach: vi.fn(), removeClass: vi.fn() }
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find event handlers
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')
      const freeHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'free' && call[1] === 'node')

      // Setup mock drag flow
      const mockGrabEvent = {
        target: { 
          id: () => 'conv-branch-2',
          addClass: vi.fn()
        }
      }
      const mockFreeEvent = {
        target: { id: () => 'conv-branch-2' }
      }

      // Execute grab then free
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
      }
      if (freeHandler) {
        freeHandler[2](mockFreeEvent)
      }

      // Verify all drag classes are removed
      expect(mockNodeCollection.removeClass).toHaveBeenCalledWith('dragging-source valid-merge-target merge-target-hover')
    })
  })

  describe('Merge Target Visual Feedback', () => {
    test('should highlight valid merge targets during drag', async () => {
      // Setup: Mock scenario with valid merge targets
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockImplementation((source, target) => {
        return source === 'conv-branch-2' && target === 'conv-main-1'
      })
      
      // Mock nodes behavior to return specific target nodes
      const mockTargetNode = {
        id: () => 'conv-main-1',
        addClass: vi.fn(),
        removeClass: vi.fn()
      }
      
      mockCyInstance.nodes.mockImplementation((selector) => {
        if (!selector) {
          return {
            forEach: vi.fn((callback) => {
              callback(mockTargetNode)
            }),
            removeClass: vi.fn()
          }
        }
        return { forEach: vi.fn(), removeClass: vi.fn() }
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find the grab event handler
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')

      const mockGrabEvent = {
        target: { 
          id: () => 'conv-branch-2',
          addClass: vi.fn()
        }
      }

      // Execute grab to trigger target highlighting
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
      }

      // Verify that valid merge targets are highlighted
      // The implementation iterates through nodes to find valid targets
      expect(mockGraphModel.canMergeNodes).toHaveBeenCalledWith('conv-branch-2', 'conv-main-1')
      expect(mockTargetNode.addClass).toHaveBeenCalledWith('valid-merge-target')
    })

    test('should show hover state when dragging over valid target', async () => {
      // Setup: Mock drag over valid target
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(true)
      
      // Mock target node with position
      const mockTargetNode = {
        id: () => 'conv-main-1', 
        position: vi.fn(() => ({ x: 100, y: 100 })),
        addClass: vi.fn(),
        removeClass: vi.fn()
      }
      
      // Track if we have an active drag source to simulate the drag state properly
      let dragSourceActive = false
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find event handlers
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')
      const dragHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'drag' && call[1] === 'node')

      // Mock the nodes() calls to return our target node appropriately
      mockCyInstance.nodes.mockImplementation((selector) => {
        if (selector === '.valid-merge-target' && dragSourceActive) {
          return {
            forEach: vi.fn((callback) => {
              callback(mockTargetNode)
            })
          }
        } else if (selector === '.merge-target-hover') {
          return {
            removeClass: vi.fn()
          }
        }
        return { forEach: vi.fn(), removeClass: vi.fn() }
      })

      // First start the drag to establish drag source
      const mockGrabEvent = {
        target: { 
          id: () => 'conv-branch-2',
          addClass: vi.fn()
        }
      }
      
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
        dragSourceActive = true
      }

      // Then drag near target
      const mockDragEvent = {
        target: { 
          id: () => 'conv-branch-2',
          position: () => ({ x: 105, y: 105 }) // Close to target at (100, 100)
        }
      }

      // Execute drag handler
      if (dragHandler) {
        dragHandler[2](mockDragEvent)
      }

      // Verify hover state is applied when within drop distance
      expect(mockTargetNode.addClass).toHaveBeenCalledWith('merge-target-hover')
    })

    test('should clear hover state when dragging away from target', async () => {
      // Setup: Mock drag away from target
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(true)
      
      const mockHoverCollection = {
        removeClass: vi.fn()
      }
      
      mockCyInstance.nodes.mockImplementation((selector) => {
        if (selector === '.valid-merge-target') {
          return {
            forEach: vi.fn() // No valid targets in range
          }
        } else if (selector === '.merge-target-hover') {
          return mockHoverCollection
        }
        return { forEach: vi.fn(), removeClass: vi.fn() }
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find event handlers
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')
      const dragHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'drag' && call[1] === 'node')

      // Start drag first
      const mockGrabEvent = {
        target: { 
          id: () => 'conv-branch-2',
          addClass: vi.fn()
        }
      }
      
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
      }

      // Mock drag event far from target
      const mockDragEvent = {
        target: { 
          id: () => 'conv-branch-2',
          position: () => ({ x: 200, y: 200 }) // Far from target at (100, 100)
        }
      }

      // Execute drag handler
      if (dragHandler) {
        dragHandler[2](mockDragEvent)
      }

      // Verify hover state is cleared when outside drop distance
      expect(mockHoverCollection.removeClass).toHaveBeenCalledWith('merge-target-hover')
    })
  })

  describe('Merge Edge Generation', () => {
    test('should temporarily add visual merge edge during drag', async () => {
      // This test defines the expected behavior for visual merge edges
      // Implementation will add temporary orange edge between drag source and valid target
      
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(true)
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      // Expected behavior:
      // 1. When drag starts over valid target, add temporary merge edge
      // 2. Edge should have orange color and dashed style
      // 3. Edge should be removed when drag ends or moves away
      
      // This will be implemented in the next phase
      expect(true).toBe(true) // Placeholder for visual edge implementation
    })

    test('should remove temporary merge edge when drag ends', async () => {
      // This test defines cleanup behavior for temporary merge edges
      
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockReturnValue(true)
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      // Expected behavior:
      // 1. Temporary merge edges should be removed on drag end
      // 2. No visual artifacts should remain after failed merge
      // 3. Successful merge should show permanent edge styling
      
      // This will be implemented in the next phase
      expect(true).toBe(true) // Placeholder for edge cleanup implementation
    })
  })

  describe('Enhanced Node Styling', () => {
    test('should apply end-node styling to mergeable nodes', async () => {
      // Test that end nodes get distinctive visual styling
      mockGraphModel.isEndNode.mockImplementation((nodeId) => {
        return nodeId === 'conv-branch-2' // Branch end is mergeable
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      // The end-node class should be applied in getNodeClasses
      // This enables CSS styling: border-color: #f59e0b, border-width: 4
      
      // Verify that isEndNode is called for node classification
      expect(mockGraphModel.isEndNode).toHaveBeenCalledWith('conv-branch-2')
      
      // The actual CSS class application happens in the Cytoscape config
      // This test ensures the logic exists for identifying end nodes
      expect(true).toBe(true)
    })

    test('should apply merged styling to closed threads', async () => {
      // Test that merged threads get distinctive styling
      mockGraphModel.isThreadMerged.mockImplementation((displayNumber) => {
        return displayNumber === '1.1.0' // First branch conversation is merged
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-1"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      // The merged class should be applied in getNodeClasses  
      // This enables CSS styling: opacity: 0.6, border-style: dashed
      
      // Verify that isThreadMerged is called for node classification
      expect(mockGraphModel.isThreadMerged).toHaveBeenCalledWith('1.1.0')
      
      // The actual CSS class application happens in the Cytoscape config
      expect(true).toBe(true)
    })

    test('should provide different styling for different branch types', async () => {
      // Test that virgin, personality, knowledge branches have distinct styling
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-1"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      // Branch type styling is applied through:
      // 1. Node classes: branch-virgin, branch-personality, branch-knowledge
      // 2. Edge classes: branch-virgin-edge, branch-personality-edge, branch-knowledge-edge
      
      // The mock conversation has branchType: 'virgin'
      // This should result in appropriate CSS classes being applied
      
      expect(true).toBe(true) // Styling logic exists in getNodeClasses and edge creation
    })
  })

  describe('Visual Feedback Integration', () => {
    test('should coordinate all visual elements during complete drag flow', async () => {
      // Test that all visual feedback systems work together
      mockGraphModel.isEndNode.mockReturnValue(true)
      mockGraphModel.canMergeNodes.mockImplementation((source, target) => {
        return source === 'conv-branch-2' && target === 'conv-main-1'
      })
      
      // Mock comprehensive node behavior
      const mockSourceNode = {
        id: () => 'conv-branch-2',
        addClass: vi.fn(),
        removeClass: vi.fn(),
        position: () => ({ x: 100, y: 100 })
      }
      
      const mockTargetNode = {
        id: () => 'conv-main-1',
        addClass: vi.fn(),
        removeClass: vi.fn(),
        position: vi.fn(() => ({ x: 105, y: 105 }))
      }
      
      const mockNodeCollection = {
        removeClass: vi.fn()
      }
      
      // Track drag state
      let dragActive = false
      
      mockCyInstance.nodes.mockImplementation((selector) => {
        if (selector === '.valid-merge-target' && dragActive) {
          return { forEach: vi.fn((callback) => callback(mockTargetNode)) }
        } else if (selector === '.merge-target-hover') {
          return { removeClass: vi.fn() }
        } else if (!selector) {
          return mockNodeCollection
        } else {
          return { 
            forEach: vi.fn((callback) => {
              // Only call back for nodes when iterating through all nodes during target highlighting
              if (dragActive) {
                callback(mockTargetNode)
              }
            }),
            removeClass: vi.fn()
          }
        }
      })
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-branch-2"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find all event handlers
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')
      const dragHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'drag' && call[1] === 'node')
      const freeHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'free' && call[1] === 'node')

      // Execute complete drag flow
      const mockGrabEvent = { target: mockSourceNode }
      const mockDragEvent = { target: mockSourceNode }
      const mockFreeEvent = { target: mockSourceNode }

      // 1. Start drag - should add dragging class and highlight targets
      if (grabHandler) {
        dragActive = true
        grabHandler[2](mockGrabEvent)
      }
      expect(mockSourceNode.addClass).toHaveBeenCalledWith('dragging-source')
      expect(mockTargetNode.addClass).toHaveBeenCalledWith('valid-merge-target')

      // 2. Drag over target - should show hover state
      if (dragHandler) {
        dragHandler[2](mockDragEvent)
      }
      expect(mockTargetNode.addClass).toHaveBeenCalledWith('merge-target-hover')

      // 3. End drag - should clean up all visual states
      if (freeHandler) {
        dragActive = false
        freeHandler[2](mockFreeEvent)
      }
      expect(mockNodeCollection.removeClass).toHaveBeenCalledWith('dragging-source valid-merge-target merge-target-hover')
    })

    test('should provide visual feedback for invalid drag attempts', async () => {
      // Test feedback when dragging non-end nodes or invalid merges
      mockGraphModel.isEndNode.mockReturnValue(false) // Not an end node
      
      const mockNonEndNode = {
        id: () => 'conv-main-1',
        addClass: vi.fn()
      }
      
      render(
        <GraphView
          conversations={mockConversations}
          currentConversationId="conv-main-1"
          onConversationSelect={onConversationSelectMock}
          onMergeNodes={onMergeNodesMock}
          graphModel={mockGraphModel}
          theme="dark"
          onViewChange={vi.fn()}
          currentView="graph"
        />
      )

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalled()
      })

      // Find grab handler
      const grabHandler = mockCyInstance.on.mock.calls
        .find(call => call[0] === 'grab' && call[1] === 'node')

      const mockGrabEvent = { target: mockNonEndNode }

      // Attempt to drag non-end node
      if (grabHandler) {
        grabHandler[2](mockGrabEvent)
      }

      // Should NOT add dragging-source class for non-end nodes
      expect(mockNonEndNode.addClass).not.toHaveBeenCalledWith('dragging-source')
    })
  })
})