import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object as ObjectModel } from "../../models/lib/object.model.js";
import { User } from "../../models/core/user.model.js";
import { saveContent } from "../../utils/helper.service.js";
import { addGoogleCalendarEvent } from "../integration/calendar.service.js";

/**
 * Calendar Integration Service
 * Handles calendar invitations, meeting creation, and scheduling
 */
export class CalendarIntegrationService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048
            }
        });
    }

    /**
     * Parse calendar request from natural language
     */
    async parseCalendarRequest(userPrompt, userId, context = {}) {
        const parsePrompt = `
Analyze this calendar request and extract structured data:
"${userPrompt}"

Return JSON with this exact structure:
{
  "type": "event_creation",
  "title": "extracted title",
  "description": "extracted description",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "timezone": "UTC",
  "location": "extracted location or empty string",
  "attendees": ["email1@example.com"],
  "recurring": {
    "isRecurring": false,
    "frequency": "none",
    "endDate": null
  },
  "confidence": 0.8
}

Current date: ${new Date().toISOString().split('T')[0]}
Current time: ${new Date().toTimeString().split(' ')[0]}`;

        try {
            const result = await this.model.generateContent(parsePrompt);
            const response = result.response.text();
            
            // Clean and parse JSON response
            let cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
            
            // Extract JSON from markdown if present
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanResponse = jsonMatch[0];
            }
            
            const parsedData = JSON.parse(cleanResponse);
            
            // Validate and set defaults
            return {
                type: parsedData.type || "event_creation",
                title: parsedData.title || "Calendar Event",
                description: parsedData.description || `Event created from: "${userPrompt}"`,
                date: parsedData.date || new Date().toISOString().split('T')[0],
                time: parsedData.time || "09:00",
                duration: parsedData.duration || 60,
                timezone: parsedData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                location: parsedData.location || "",
                attendees: parsedData.attendees || [],
                recurring: parsedData.recurring || {
                    isRecurring: false,
                    frequency: "none",
                    endDate: null
                },
                confidence: parsedData.confidence || 0.7
            };
        } catch (error) {
            console.error("Error parsing calendar request:", error);
            return this.getDefaultCalendarData(userPrompt);
        }
    }

    /**
     * Create intelligent calendar event with Google Calendar integration
     */
    async createIntelligentEvent(userPrompt, userId, context = {}) {
        try {
            console.log(`Creating intelligent calendar event for user ${userId}: ${userPrompt}`);
            
            // Parse the calendar request using AI
            const calendarData = await this.parseCalendarRequest(userPrompt, userId, context);

        // Default to 30 minutes if no duration is specified
        if (!calendarData.duration) {
            this.logger.info('Duration not specified, defaulting to 30 minutes.');
            calendarData.duration = 30;
        }
            console.log('Parsed calendar data:', calendarData);
            
            // Create event object in database
            const eventObject = {
                type: 'calendar_event',
                title: calendarData.title,
                description: calendarData.description,
                metadata: {
                    date: calendarData.date,
                    time: calendarData.time,
                    duration: calendarData.duration,
                    timezone: calendarData.timezone,
                    location: calendarData.location,
                    attendees: calendarData.attendees,
                    recurring: calendarData.recurring,
                    confidence: calendarData.confidence,
                    originalPrompt: userPrompt,
                    createdAt: new Date().toISOString()
                },
                userId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Save to database
            const savedEvent = await ObjectModel.create(eventObject);
            console.log('Saved event to database:', savedEvent._id);
            
            // Try to integrate with Google Calendar
            let calendarIntegrated = false;
            let calendarEventId = null;
            
            try {
                const user = await User.findById(userId);

                if (user && user.integration && user.integration.googleCalendar && user.integration.googleCalendar.accessToken) {
                    const googleEvent = {
                        summary: calendarData.title,
                        description: calendarData.description,
                        location: calendarData.location,
                        start: {
                            dateTime: `${calendarData.date}T${calendarData.time}:00`,
                            timeZone: 'Asia/Kolkata',
                        },
                        end: {
                            dateTime: this.calculateEndTime(calendarData.date, calendarData.time, calendarData.duration),
                            timeZone: 'Asia/Kolkata',
                        },
                        attendees: calendarData.attendees.map(email => ({ email }))
                    };

                    console.log('Creating Google Calendar event:', googleEvent);
                    const googleResult = await addGoogleCalendarEvent(user, googleEvent);

                    if (googleResult && googleResult.success) {
                        calendarIntegrated = true;
                        calendarEventId = googleResult.eventId;

                        await ObjectModel.findByIdAndUpdate(savedEvent._id, {
                            'metadata.googleCalendarEventId': calendarEventId,
                            'metadata.calendarIntegrated': true,
                            updatedAt: new Date()
                        });

                        console.log('Successfully integrated with Google Calendar:', calendarEventId);
                    } else {
                        const detailedError = googleResult && googleResult.error ? googleResult.error : 'Unknown error during calendar integration.';
                        console.error('Google Calendar integration failed:', detailedError);
                    }
                } else {
                    console.log('User or Google Calendar integration not found or not configured.');
                }
            } catch (calendarError) {
                const detailedError = calendarError.response && calendarError.response.data ? JSON.stringify(calendarError.response.data) : calendarError.message;
                console.error('An exception occurred during Google Calendar integration:', detailedError);
            }
            
            // Prepare response
            const response = {
                success: true,
                type: 'calendar_event_created',
                message: calendarIntegrated 
                    ? `Successfully created calendar event "${calendarData.title}" and added to your Google Calendar.`
                    : `Created calendar event "${calendarData.title}" in local database. Google Calendar integration unavailable.`,
                response: {
                    eventId: savedEvent._id,
                    googleEventId: calendarEventId,
                    title: calendarData.title,
                    date: calendarData.date,
                    time: calendarData.time,
                    duration: calendarData.duration,
                    location: calendarData.location,
                    confidence: calendarData.confidence
                },
                calendarIntegrated,
                suggestions: [
                    "You can ask me to modify this event",
                    "Say 'show my calendar' to see all events",
                    "Ask me to create recurring events"
                ]
            };
            
            return response.message;
            
        } catch (error) {
            console.error('Error creating intelligent calendar event:', error);
            return {
                success: false,
                type: 'calendar_error',
                message: 'Sorry, I encountered an error while creating your calendar event. Please try again.',
                response: {
                    error: error.message,
                    originalPrompt: userPrompt
                },
                calendarIntegrated: false,
                suggestions: [
                    "Try rephrasing your request",
                    "Include more specific date and time information",
                    "Check your Google Calendar integration"
                ]
            };
        }
    }

    /**
     * Calculate end time based on start time and duration
     */
    calculateEndTime(date, startTime, durationMinutes) {
        // Append 'Z' to ensure the date string is parsed as UTC
        const startDateTime = new Date(`${date}T${startTime}:00Z`);
        const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60000));

        // Use ISO string and slice to get 'YYYY-MM-DDTHH:mm:ss' format
        return endDateTime.toISOString().slice(0, 19);
    }

    /**
     * Get default calendar data for fallback
     */
    getDefaultCalendarData(userPrompt) {
        const now = new Date();
        
        // Try to extract basic time information from the prompt
        let eventTime = "09:00";
        let eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + 1); // Default to tomorrow
        
        // Simple time extraction
        const timePatterns = [
            /at (\d{1,2}):?(\d{2})? ?(am|pm)/i,
            /at (\d{1,2}) ?(am|pm)/i,
            /(\d{1,2}):?(\d{2}) ?(am|pm)/i,
            /(\d{1,2}) ?(am|pm)/i
        ];
        
        for (const pattern of timePatterns) {
            const match = userPrompt.match(pattern);
            if (match) {
                let hour = parseInt(match[1]);
                const minute = match[2] ? parseInt(match[2]) : 0;
                const period = match[3] || match[2];
                
                if (period && period.toLowerCase() === 'pm' && hour !== 12) {
                    hour += 12;
                } else if (period && period.toLowerCase() === 'am' && hour === 12) {
                    hour = 0;
                }
                
                eventTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                break;
            }
        }
        
        // Simple date extraction
        const datePatterns = [
            /today/i,
            /tomorrow/i,
            /next week/i,
            /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
        ];
        
        for (const pattern of datePatterns) {
            if (userPrompt.match(pattern)) {
                const match = userPrompt.match(pattern)[0].toLowerCase();
                if (match === 'today') {
                    eventDate = new Date(now);
                } else if (match === 'tomorrow') {
                    eventDate = new Date(now);
                    eventDate.setDate(eventDate.getDate() + 1);
                } else if (match === 'next week') {
                    eventDate = new Date(now);
                    eventDate.setDate(eventDate.getDate() + 7);
                }
                break;
            }
        }
        
        return {
            type: "event_creation",
            title: userPrompt.length > 50 ? "Calendar Event" : userPrompt,
            description: `Event created from: "${userPrompt}"`,
            date: eventDate.toISOString().split('T')[0],
            time: eventTime,
            duration: 60,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            location: "",
            attendees: [],
            recurring: {
                isRecurring: false,
                frequency: "none",
                endDate: null
            },
            confidence: 0.5
        };
    }
}
