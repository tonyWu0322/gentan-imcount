import { createContext } from 'react';
import { TimeAccountsContextType } from '../types';

export const TimeAccountsContext = createContext<TimeAccountsContextType | null>(null); 