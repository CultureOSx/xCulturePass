export interface CheckIn {
  ticketId: string;
  userId: string;
  checkedInAt: string;
  checkedInBy?: string;
  gate?: string;
}
