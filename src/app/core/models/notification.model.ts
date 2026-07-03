export type NotificationType =
  | 'proposal'
  | 'counteroffer'
  | 'agreement'
  | 'reception'
  | 'sale'
  | 'payout';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  text: string;
  date: Date;
  read: boolean;
  target: string;
}
