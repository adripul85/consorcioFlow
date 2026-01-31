
export interface UnitPayment {
  id: string;
  amount: number;
  date: string;
}

export interface Unit {
  id: string;
  floor: string;
  department: string;
  coefficient: number;
  owner: string;
  payments?: UnitPayment[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paid: boolean;
  status?: 'pending' | 'approved'; 
  receiptUrl?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'payment' | 'collection' | 'other';
  notes?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  fantasyName: string;
  businessName: string;
  ownerFullName: string;
  initialBalance: number;
  lowBalanceThreshold?: number;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  type: 'debit' | 'credit'; 
  amount: number;
  reference?: string; 
  entityName: string;
  transferDetails?: {
    cbu?: string;
    opId?: string;
  };
}

export interface Cheque {
  id: string;
  number: string;
  bank: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  entityName: string; // Quien lo dio o quien lo recibe
  type: 'received' | 'issued';
  status: 'pending' | 'cleared' | 'rejected' | 'cancelled';
  notes?: string;
}

export interface CashAudit {
  id: string;
  date: string;
  calculatedAmount: number;
  foundAmount: number;
  responsible: string;
  notes?: string;
}

export interface Liquidation {
  id: string;
  period: string; 
  monthIdx: number;
  year: number;
  totalExpenses: number;
  dateGenerated: string;
  unitsData: {
    unitId: string;
    amount: number;
    owner: string;
    pisoDepto: string;
    paidStatus: 'paid' | 'partial' | 'pending';
  }[];
}

export interface Building {
  id: string;
  name: string;
  address: string;
  units: Unit[];
  expenses: Expense[];
  categories: string[];
  events: CalendarEvent[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  cheques: Cheque[]; // Nueva propiedad
  cashAudits: CashAudit[];
  liquidations: Liquidation[];
}

export type View = 'buildings' | 'dashboard' | 'units' | 'expenses' | 'income' | 'settlements' | 'ai-helper' | 'calendar' | 'neighbor-portal' | 'bank-balance' | 'provider-portal';
