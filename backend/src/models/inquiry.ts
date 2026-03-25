export function newInquiry(
  name: string,
  email: string,
  message: string,
  phone: string | null = null,
  packageId: string | null = null,
  eventDate: Date | null = null,
  eventTime: string | null = null,
  eventDuration: string | null = null,
) {
  return {
    name,
    email,
    phone,
    package_id: packageId,
    message,
    event_date: eventDate,
    event_time: eventTime,
    event_duration: eventDuration,
    status: 'new',
    created_at: new Date(),
  };
}
