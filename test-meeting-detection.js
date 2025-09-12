// Test script for meeting platform detection
const { GoogleCalendarService } = require('./src/lib/google-calendar.ts');

// Test events with different meeting platforms
const testEvents = [
  {
    id: 'test-zoom-1',
    summary: 'Team Standup',
    description: 'Join Zoom Meeting: https://zoom.us/j/1234567890',
    location: null,
    hangoutLink: null
  },
  {
    id: 'test-teams-1',
    summary: 'Client Meeting',
    description: null,
    location: 'Microsoft Teams Meeting - Click here to join: https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc123',
    hangoutLink: null
  },
  {
    id: 'test-meet-1',
    summary: 'Project Review',
    description: 'Google Meet link: https://meet.google.com/abc-defg-hij',
    location: null,
    hangoutLink: 'https://meet.google.com/abc-defg-hij'
  },
  {
    id: 'test-no-meeting',
    summary: 'In-Person Coffee',
    description: 'Let\'s meet at the local coffee shop',
    location: '123 Main St, Coffee Shop',
    hangoutLink: null
  }
];

console.log('🧪 Testing Meeting Platform Detection\n');

testEvents.forEach((event, index) => {
  console.log(`Test ${index + 1}: ${event.summary}`);
  console.log(`Description: ${event.description || 'None'}`);
  console.log(`Location: ${event.location || 'None'}`);
  console.log(`Hangout Link: ${event.hangoutLink || 'None'}`);
  
  const platform = GoogleCalendarService.detectMeetingPlatform(event);
  
  if (platform) {
    console.log(`✅ Detected: ${platform.platform.toUpperCase()}`);
    console.log(`   URL: ${platform.url}`);
    if (platform.meetingId) {
      console.log(`   Meeting ID: ${platform.meetingId}`);
    }
  } else {
    console.log('❌ No meeting platform detected');
  }
  
  console.log('---\n');
});
