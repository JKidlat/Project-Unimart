/**
 * ==============================================================================
 * KYC (KNOW YOUR CUSTOMER) VERIFICATION CONTEXT (KYCContext.tsx)
 * ==============================================================================
 * Manages seller identity verification state via the Django REST backend (`/api/kyc/`).
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, tokenStorage } from '../../lib/api';

export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface KYCSubmission {
  id?: number;
  email: string;
  selfieBase64: string;
  idDocBase64: string;
  institutionEmail: string;
  businessName: string;
  mode: 'seller_first' | 'buyer_upgrade';
  status: KYCStatus;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

interface KYCContextType {
  kycStatus: KYCStatus;
  kycData: KYCSubmission | null;
  submitKYC: (data: Omit<KYCSubmission, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'rejectionReason'>) => Promise<void>;
  refreshKYCStatus: () => Promise<void>;
}

const KYCContext = createContext<KYCContextType | undefined>(undefined);

export const KYCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kycStatus, setKYCStatus] = useState<KYCStatus>('none');
  const [kycData, setKYCData] = useState<KYCSubmission | null>(null);

  const refreshKYCStatus = useCallback(async () => {
    const token = tokenStorage.getAccess();
    const user = tokenStorage.getUser();
    if (!token || !user?.email) {
      setKYCStatus('none');
      setKYCData(null);
      return;
    }

    try {
      const res = await api.get<KYCSubmission[] | { results: KYCSubmission[] }>('/kyc/');
      const list = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
      const mine =
        list.find((r) => (r.email || '').toLowerCase() === user.email.toLowerCase()) ||
        list[0] ||
        null;

      if (mine) {
        setKYCStatus(mine.status as KYCStatus);
        setKYCData(mine);
      } else {
        setKYCStatus((user.kyc_status as KYCStatus) || 'none');
        setKYCData(null);
      }
    } catch {
      setKYCStatus((user.kyc_status as KYCStatus) || 'none');
    }
  }, []);

  useEffect(() => {
    refreshKYCStatus();
  }, [refreshKYCStatus]);

  const submitKYC = useCallback(
    async (data: Omit<KYCSubmission, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'rejectionReason'>) => {
      const created = await api.post<KYCSubmission>('/kyc/', {
        institutionEmail: data.institutionEmail,
        businessName: data.businessName,
        selfieBase64: data.selfieBase64,
        idDocBase64: data.idDocBase64,
        mode: data.mode,
      });

      const user = tokenStorage.getUser();
      if (user) {
        tokenStorage.setUser({ ...user, kyc_status: created.status || 'pending' });
      }

      setKYCStatus((created.status as KYCStatus) || 'pending');
      setKYCData(created);
    },
    []
  );

  return (
    <KYCContext.Provider value={{ kycStatus, kycData, submitKYC, refreshKYCStatus }}>
      {children}
    </KYCContext.Provider>
  );
};

export const useKYC = () => {
  const ctx = useContext(KYCContext);
  if (!ctx) throw new Error('useKYC must be used within KYCProvider');
  return ctx;
};
