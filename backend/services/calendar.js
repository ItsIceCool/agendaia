const { google } = require('googleapis');

function getCalendarClient(credentials) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(credentials);
  return google.calendar({ version: 'v3', auth });
}

async function getAvailableSlots({ credentials, calendarId, date }) {
  const calendar = getCalendarClient(credentials);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data } = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return data.items || [];
}

async function createEvent({ credentials, calendarId, summary, start, end, description }) {
  const calendar = getCalendarClient(credentials);

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: start, timeZone: 'America/Monterrey' },
      end: { dateTime: end, timeZone: 'America/Monterrey' },
    },
  });

  return data;
}

async function deleteEvent({ credentials, calendarId, eventId }) {
  const calendar = getCalendarClient(credentials);
  await calendar.events.delete({ calendarId, eventId });
}

module.exports = { getAvailableSlots, createEvent, deleteEvent };
