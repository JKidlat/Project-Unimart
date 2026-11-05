/**
 * ==============================================================================
 * KYC (KNOW YOUR CUSTOMER) VERIFICATION CONTEXT (KYCContext.tsx)
 * ==============================================================================
 * This React Context manages seller identity verification state.
 *
 * Why KYC is required on Unimart:
 * - Unimart is a trusted campus marketplace exclusively for Ghanaian students.
 * - To prevent fraud, stolen goods, and scammers, students who want to sell items
 *   must submit proof of identity (student ID card or Ghana Card, selfie, and
 *   institution email).
 * - Only after an Administrator approves the KYC request can the student post ads
 *   and receive orders.
 *
 * Verification Lifecycle:
 * 1. 'none'     -> User has not submitted verification documents.
 * 2. 'pending'  -> Submitted; currently in Admin review queue.
 * 3. 'approved' -> Verified by Admin; full seller studio privileges granted.
 * 4. 'rejected' -> Rejected by Admin with a visible reason (e.g. blurry ID card).
 *
 * How to use:
 * const { kycStatus, submitKYC, refreshKYCStatus } = useKYC();
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { kycStorage, tokenStorage } from '../../lib/api';

// Four possible verification states
export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';

// Structure of an identity verification submission
export interface KYCSubmission {
  email: string;                  // User's student email
  selfieBase64: string;           // Base64 encoded selfie image
  idDocBase64: string;            // Base64 encoded student ID or Ghana Card image
  institutionEmail: string;       // Official campus email
  businessName: string;           // Store / trade name
  mode: 'seller_first' | 'buyer_upgrade'; // Whether newly registering or upgrading from Buyer
  status: KYCStatus;              // Current approval state
  submittedAt: string;            // ISO timestamp
  reviewedAt: string | null;      // ISO timestamp when admin reviewed
  rejectionReason: string | null; // Feedback note from admin if rejected
}

// Interface for values and methods provided by useKYC()
interface KYCContextType {
  kycStatus: KYCStatus;
  kycData: KYCSubmission | null;
  submitKYC: (data: Omit<KYCSubmission, 'status' | 'submittedAt' | 'reviewedAt' | 'rejectionReason'>) => Promise<void>;
  refreshKYCStatus: () => void;
}

// Create the context
const KYCContext = createContext<KYCContextType | undefined>(undefined);

// ==============================================================================
// KYC PROVIDER COMPONENT
// ==============================================================================
export const KYCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kycStatus, setKYCStatus] = useState<KYCStatus>('none');
  const [kycData, setKYCData] = useState<KYCSubmission | null>(null);

  /**
   * Refreshes the active user's verification record from localStorage.
   */
  const refreshKYCStatus = useCallback(() => {
    const user = tokenStorage.getUser();
    if (!user?.email) {
      setKYCStatus('none');
      setKYCData(null);
      return;
    }
    const record = kycStorage.getByEmail(user.email);
    if (record) {
      setKYCStatus(record.status as KYCStatus);
      setKYCData(record);
    } else {
      // Also check if user session has kyc_status set directly
      setKYCStatus(user.kyc_status || 'none');
      setKYCData(null);
    }
  }, []);

  // Check verification status when provider mounts
  useEffect(() => {
    refreshKYCStatus();
  }, [refreshKYCStatus]);

  /**
   * Submits new KYC documents for administrator review.
   */
  const submitKYC = useCallback(async (data: Omit<KYCSubmission, 'status' | 'submittedAt' | 'reviewedAt' | 'rejectionReason'>) => {
    const submission: KYCSubmission = {
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      rejectionReason: null,
    };
    kycStorage.save(submission);

    // Synchronize active user session object
    const user = tokenStorage.getUser();
    if (user) {
      tokenStorage.setUser({ ...user, kyc_status: 'pending' });
    }

    setKYCStatus('pending');
    setKYCData(submission);
  }, []);

  return (
    <KYCContext.Provider value={{ kycStatus, kycData, submitKYC, refreshKYCStatus }}>
      {children}
    </KYCContext.Provider>
  );
};

// ==============================================================================
// CUSTOM HOOK: useKYC()
// ==============================================================================
/**
 * Hook to read KYC status and submit identity documents from any component.
 */
export const useKYC = () => {
  const ctx = useContext(KYCContext);
  if (!ctx) throw new Error('useKYC must be used within KYCProvider');
  return ctx;
};
