import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import type { Event } from '../../lib/api';

interface EchoTabProps {
  event: Event | null;
  onBackToDetails: () => void;
  onEchoReset?: () => void;
}

export function EchoTab({ event, onBackToDetails, onEchoReset }: EchoTabProps) {
  const [flowchart, setFlowchart] = useState<string>('');
  const [hasEcho, setHasEcho] = useState(false);
  const [isRenderingFlowchart, setIsRenderingFlowchart] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
    });
  }, []);

  // Effect to render Mermaid flowchart when it changes
  useEffect(() => {
    if (!flowchart || !mermaidContainerRef.current) {
      return;
    }

    const renderFlowchart = async () => {
      setIsRenderingFlowchart(true);
      
      try {
        if (mermaidContainerRef.current) {
          // Clear the container first
          mermaidContainerRef.current.innerHTML = '';
          
          // Create a new div with the mermaid class and flowchart content
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          mermaidDiv.textContent = flowchart;
          
          // Append to the container
          mermaidContainerRef.current.appendChild(mermaidDiv);
          
          // Render the Mermaid diagram
          await mermaid.run({
            nodes: [mermaidDiv],
          });

          // Mermaid fits the chart to its container, capped at its natural
          // width. A phone draws it at that natural width and scrolls it
          // sideways instead (index.css), so hand the number to CSS.
          const naturalWidth = mermaidDiv.querySelector('svg')?.style.maxWidth;
          if (naturalWidth) {
            mermaidContainerRef.current?.style.setProperty('--echo-flowchart-width', naturalWidth);
          }
        }
      } catch (error) {
        console.error('Error rendering flowchart:', error);
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = `<pre>${flowchart}</pre>`;
        }
      } finally {
        setIsRenderingFlowchart(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(renderFlowchart, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [flowchart]);

  // Initialize echo state when event changes
  useEffect(() => {
    console.log('EchoTab: Event changed:', event);
    console.log('EchoTab: Event flowchart:', event?.flowchart);
    
    if (event?.flowchart) {
      setFlowchart(event.flowchart);
      setHasEcho(true);
      console.log('EchoTab: Set flowchart and hasEcho to true');
    } else {
      setFlowchart('');
      setHasEcho(false);
      console.log('EchoTab: Cleared flowchart and hasEcho to false');
    }
  }, [event]);

  const handleResetEcho = async () => {
    if (!event?.id || !hasEcho) return;
    
    if (!confirm('Are you sure you want to reset the echo flow? This will delete all follow-up events and the flowchart.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch(`/api/events/${event.id}/echo/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'demo-user' })
      });
      
      if (response.ok) {
        // Clear local state immediately
        setFlowchart('');
        setHasEcho(false);
        
        // Clear the mermaid container
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = '';
        }
        
        // Notify parent component that echo was reset
        if (onEchoReset) {
          onEchoReset();
        }
        
        // Don't refresh all events to avoid calendar re-rendering
        // The local state is already updated above
        
        console.log('Echo reset successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to reset echo:', errorText);
        alert('Failed to reset echo. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting echo:', error);
      alert('Failed to reset echo. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="echo-tab px-4 py-2">
      <div className="mb-4">

      </div>

      <div className="echo-tab__canvas bg-gray-50 rounded-lg p-4 mb-4 min-h-[300px] flex items-center justify-center">
        {flowchart ? (
          <div className="w-full overflow-x-auto">
            <div
              ref={mermaidContainerRef}
              className="echo-tab__flowchart mermaid flex justify-center"
              style={{ minHeight: '200px' }}
            >
              {/* Content will be set by useEffect */}
            </div>
            
            {isRenderingFlowchart && (
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Rendering flowchart...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">No flowchart available yet</p>
            <p className="text-sm text-gray-400 mt-1">Generate echo events in the Details tab to see the flowchart</p>
          </div>
        )}
      </div>
      
      <div className="echo-tab__actions flex justify-center space-x-3">
        <button
          type="button"
          onClick={onBackToDetails}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Details
        </button>
        
        {hasEcho && (
          <button
            type="button"
            onClick={handleResetEcho}
            disabled={isResetting}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset Echo'}
          </button>
        )}
      </div>
    </div>
  );
}
