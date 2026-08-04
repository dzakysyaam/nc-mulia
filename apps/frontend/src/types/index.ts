// Shared types aligned with backend Prisma schema + API responses

export type Role = 'super_admin' | 'admin' | 'user';
export type MemberStatus = 'regular' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role; // Primary role (legacy RBAC field)
  roles?: string[]; // RBAC roles from userRoles junction
  membershipStatus?: MemberStatus;
  membershipStartedAt?: string;
  membershipExpiresAt?: string | null;
  membershipActive?: boolean;
  isActive?: boolean;
  createdAt?: string;
  permissions?: string[];
}

export type BmiCategoryLabel = 'Kurus' | 'Normal' | 'Kelebihan Berat' | 'Obesitas';

export interface BmiRecord {
  id: string;
  weightKg: number;
  heightCm: number;
  bmiValue: number;
  bmiCategory: BmiCategoryLabel;
  createdAt: string;
}

export type ConsultationStatus = 'pending' | 'answered' | 'closed';

export interface Consultation {
  id: string;
  question: string;
  response?: string | null;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  benefits?: string;
  imageUrl?: string;
  image?: string;
  type?: string;
  stock?: number;
  isAvailable?: boolean;
  isActive?: boolean;
  isMemberDiscountEligible?: boolean;
  basePrice?: number;
  price?: number;
  pricing?: {
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    membershipApplied: boolean;
  };
}

export type BmiCategory = 'Kurus' | 'Normal' | 'Kelebihan Berat' | 'Obesitas';

export interface CartProduct {
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalUnitPrice: number;
  subtotal: number;
}

export interface TransactionPayment {
  id: string;
  method: string;
  status: string;
  amount: number;
}

export interface Transaction {
  id: string;
  membershipStatusSnapshot: 'regular' | 'member';
  items: CartProduct[];
  normalTotal: number;
  totalDiscount: number;
  finalTotal: number;
  status: string;
  payments?: TransactionPayment[];
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

export type PaymentMethod = 'qris' | 'bca' | 'bri' | 'bni' | 'mandiri' | 'ovo' | 'gopay' | 'dana' | 'shopeepay';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface Payment {
  id: string;
  transactionId: string;
  method: PaymentMethod;
  provider: string;
  amount: number;
  referenceNumber: string;
  paymentCode?: string | null;
  qrPayload?: string | null;
  status: PaymentStatus;
  paidAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'user';
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  customerName: string;
  category: 'service' | 'complaint';
  status: 'open' | 'in progress' | 'closed';
  unreadCount?: number;
  unreadByAdmin?: number;
  lastMessageAt: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalConsultations: number;
  pendingConsultations: number;
  totalBmiRecords: number;
  totalTransactions: number;
  recentActivity?: Array<{
    id: string;
    type: 'consultation' | 'transaction' | 'bmi';
    text: string;
    time: string;
  }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BmiResult {
  value: number;
  category: BmiCategory;
  description: string;
}

export interface Recommendation {
  title: string;
  description: string;
  productIds: string[];
  disclaimer: string;
}

export interface AdminBmiRecord {
  id: string;
  weightKg: number;
  heightCm: number;
  bmiValue: number;
  bmiCategory: BmiCategory;
  createdAt: string;
  user: { name: string; email: string };
}
