import React, { useState, useEffect, useRef } from 'react';
import type { Event, CreateEventRequest, UpdateEventRequest } from '../../lib/api';
import { ErrorBoundary } from '../ErrorBoundary';
import { EchoTab } from './EchoTab';
import { EventForm } from './EventForm';
import { useEchoGeneration } from '../../hooks/useEchoGeneration';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  calendarId: string;
  selectedDate?: Date;
  selectedHour?: number;
  selectedMinute?: number;
  onSave: (eventData: CreateEventRequest | UpdateEventRequest) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function EventModal({ 
  isOpen, 
  onClose, 
  event, 
  calendarId, 
  selectedDate, 
  selectedHour,
  selectedMinute,
  onSave, 
  onDelete
}: EventModalProps) {
  const [localEvent, setLocalEvent] = useState<Event | null>(event || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [eventType, setEventType] = useState<'work' | 'fun' | 'other'>('other');
  const [isLoading, setIsLoading] = useState(false);
  
  // Echo-related state
  const [activeTab, setActiveTab] = useState<'details' | 'echo'>('details');
  
  // Use the echo generation hook
  const {
    hasEcho,
    isGeneratingEcho,
    handleEchoGeneration,
    handleEchoReset,
    initializeEchoState
  } = useEchoGeneration({ localEvent, setLocalEvent });

  // Function to reset form to default values
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setTimezone('America/New_York');
    setEventType('other');
    setActiveTab('details');
    initializeEchoState(null);
  };

  useEffect(() => {
    if (event) {
      // Update local event when prop changes
      setLocalEvent(event);
      
      // Editing existing event
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType || 'other');
      
      const start = new Date(event.start);
      const end = new Date(event.end);
      
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0, 5));
      setTimezone(event.tz);
      
      // Initialize echo state
      initializeEchoState(event);
    } else if (selectedDate) {
      // Creating new event - reset form first, then set date/time
      resetForm();
      
      // Use local date formatting to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      setStartDate(date);
      setEndDate(date);
      
      if (selectedHour !== undefined) {
        const startMinute = selectedMinute !== undefined ? selectedMinute : 0;
        const startHour = selectedHour;
        const endMinute = startMinute === 0 ? 30 : 0;
        const endHour = startMinute === 0 ? startHour : startHour + 1;
        
        setStartTime(`${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`);
        setEndTime(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
      } else {
        setStartTime('09:00');
        setEndTime('09:30');
      }
    } else {
      // Modal opened without event or date - reset to defaults
      resetForm();
    }
  }, [event, selectedDate, selectedHour, selectedMinute]);

  // Cleanup effect to reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen]);

  // Custom close handler that ensures form is reset
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Close when clicking the backdrop (outside the panel). We require the press
  // and the release to both land on the backdrop so a text selection that
  // starts inside the panel and drifts outside doesn't close the modal.
  const backdropPressRef = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    backdropPressRef.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!backdropPressRef.current) return;
    backdropPressRef.current = false;
    handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsLoading(true);
    
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (startDateTime >= endDateTime) {
        alert('End time must be after start time');
        return;
      }

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        tz: timezone,
        eventType: eventType,
        ...(localEvent ? {} : { calendar_id: calendarId })
      };

      await onSave(eventData);
      handleClose();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!localEvent || !onDelete) return;
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    setIsLoading(true);
    
    try {
      await onDelete(localEvent.id);
      handleClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <ErrorBoundary>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {event ? 'Edit Event' : 'New Event'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                className={`px-4 py-1.5 text-sm font-medium border-b-2 ${
                  activeTab === 'details' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-medium border-b-2 flex items-center space-x-1 ${
                  activeTab === 'echo' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('echo')}
              >
                <span>Echo</span>
                {hasEcho && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </div>
          </div>
          
          {activeTab === 'details' && (
            <EventForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              startDate={startDate}
              setStartDate={setStartDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endDate={endDate}
              setEndDate={setEndDate}
              endTime={endTime}
              setEndTime={setEndTime}
              timezone={timezone}
              setTimezone={setTimezone}
              eventType={eventType}
              setEventType={setEventType}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              onDelete={handleDelete}
              onGenerateEcho={handleEchoGeneration}
              isLoading={isLoading}
              isGeneratingEcho={isGeneratingEcho}
              localEvent={localEvent}
            />
          )}
          
          {activeTab === 'echo' && (
            <EchoTab 
              event={localEvent || null} 
              onBackToDetails={() => setActiveTab('details')}
              onEchoReset={handleEchoReset}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
