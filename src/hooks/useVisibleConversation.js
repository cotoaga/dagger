import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect which conversation is currently visible in the viewport
 * Uses Intersection Observer to track visibility and trigger callbacks
 * Enhanced with debouncing and loop prevention
 */
export const useVisibleConversation = (conversations, onVisibleChange, isEnabled = true) => {
  const observerRef = useRef();
  const lastVisibleRef = useRef();
  const debounceTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (!isEnabled || !conversations || conversations.length === 0) {
      console.log('😴 Intersection Observer disabled:', { isEnabled, conversationsCount: conversations?.length || 0 });
      return;
    }
    
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Clear previous debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        
        // Debounce the visibility changes to prevent rapid fire
        debounceTimeoutRef.current = setTimeout(() => {
          // Find the entry with the highest intersection ratio
          let mostVisible = null;
          let highestRatio = 0;
          
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
              mostVisible = entry;
              highestRatio = entry.intersectionRatio;
            }
          });
          
          // Only trigger callback if we have a clearly visible conversation (higher threshold)
          if (mostVisible && highestRatio > 0.6) {
            const conversationId = mostVisible.target.dataset.conversationId;
            
            // Prevent ping-ponging between same conversations  
            if (conversationId && conversationId !== lastVisibleRef.current) {
              console.log('👁️ Visible conversation changed to:', conversationId);
              lastVisibleRef.current = conversationId;
              onVisibleChange(conversationId);
            }
          }
        }, 300); // 300ms debounce
      },
      {
        root: null, // Use viewport as root
        rootMargin: '-10% 0px -10% 0px', // More conservative detection - 80% of element must be visible
        threshold: [0.6] // Higher threshold - more of element must be visible to prevent jitter
      }
    );
    
    observerRef.current = observer;
    
    // Observe all conversation cards after a short delay to ensure DOM is ready
    setTimeout(() => {
      const cards = document.querySelectorAll('[data-conversation-id]');
      cards.forEach(card => {
        if (card.dataset.conversationId) {
          observer.observe(card);
        }
      });
      console.log(`👁️ Observing ${cards.length} conversation cards for visibility`);
    }, 100);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [conversations, onVisibleChange, isEnabled]);
  
  return observerRef;
};