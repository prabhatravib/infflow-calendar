import React from 'react';
import type { Event } from '../../lib/api';

interface EventFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
  eventType: 'work' | 'fun' | 'other';
  setEventType: (type: 'work' | 'fun' | 'other') => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onGenerateEcho?: () => void;
  isLoading: boolean;
  isGeneratingEcho: boolean;
  localEvent: Event | null;
}

export function EventForm({
  title,
  setTitle,
  description,
  setDescription,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  timezone,
  setTimezone,
  eventType,
  setEventType,
  onSubmit,
  onCancel,
  onDelete,
  onGenerateEcho,
  isLoading,
  isGeneratingEcho,
  localEvent
}: EventFormProps) {
  return (
    <form onSubmit={onSubmit} className="event-form px-4 py-2">
      <div className="space-y-2">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-0.5">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Event title"
            required
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-0.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Event description"
            rows={2}
          />
        </div>
        
        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-0.5">
            Event Type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as 'work' | 'fun' | 'other')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="work">Work</option>
            <option value="fun">Fun</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        {/* Start Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              Start Time *
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        {/* End Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              End Time *
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-0.5">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
      </div>
      
      {/* Actions */}
      <div className="event-form__actions flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="event-form__secondary flex space-x-2">
          {localEvent && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          {/* Echo generation button only shows for existing events with IDs */}
          {localEvent?.id && onGenerateEcho && (
            <button
              type="button"
              onClick={onGenerateEcho}
              disabled={isGeneratingEcho || isLoading}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
            >
              {isGeneratingEcho ? 'Generating...' : '🎯 Generate Echo Events'}
            </button>
          )}
        </div>
        
        <div className="event-form__primary flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (localEvent ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </form>
  );
}
