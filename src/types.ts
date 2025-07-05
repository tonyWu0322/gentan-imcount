import React from 'react';

// =====================================
// 类型与接口定义 (Type & Interface Definitions)
// =====================================
export interface TimeAccounts {
  [key: string]: number;
}

export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TimeLog {
  id: string;
  type: 'timer' | 'transfer';
  timestamp: number;
  // Timer-specific
  taskId?: string;
  taskText?: string;
  startTime?: number;
  endTime?: number;
  // Transfer-specific
  fromAccount?: string;
  toAccount?: string;
  transferAmount?: number;
}

export interface TimeAccountsContextType {
  timeAccounts: TimeAccounts;
  setTimeAccounts: React.Dispatch<React.SetStateAction<TimeAccounts>>;
  formatTime: (seconds: number) => string;
  timeUnitForGrowth: number;
  addMonumentAccount: (name: string) => boolean;
} 