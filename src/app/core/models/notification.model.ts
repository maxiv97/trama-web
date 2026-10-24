export type NotificationType =
  | 'proposal'
  | 'counteroffer'
  | 'agreement'
  | 'reception'
  | 'sale'
  | 'payout'
  | 'delivery'
  | 'expiry'
  | 'pickup';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  text: string;
  date: Date;
  read: boolean;
  target: string;
}
