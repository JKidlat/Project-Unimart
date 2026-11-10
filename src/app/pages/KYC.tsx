import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import {
  Camera, Upload, Mail, Briefcase, ShieldCheck,
  CheckCircle2, Clock, XCircle, AlertTriangle, ChevronRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { useKYC } from '../context/KYCContext';

/**
 * KYC Verification Page
 *
 * Required for:
 *   - A seller posting their FIRST ad
 *   - A buyer requesting upgrade to Seller
 *
 * Optional for buyers who want identity verification.
 *
 * Documents collected:
 *   - Selfie photo
 *   - Student ID or Ghana Card
 *   - Institution email
 *   - Business name
 */

/** Convert File → base64 string for localStorage storage */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const KYC: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') || 'seller_first') as 'seller_first' | 'buyer_upgrade';

  const { user, updateProfile } = useUser();
  const { kycStatus, kycData, submitKYC } = useKYC();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [institutionEmail, setInstitutionEmail] = useState(user?.email || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [agreeSellerPolicies, setAgreeSellerPolicies] = useState(false);

  const selfieRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in first.</p>
      </div>
    );
  }

  // ── Show current status if already submitted ──
  if (kycStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 border border-[#f3d7db] shadow-2xl shadow-[#a14b581a] text-center"
        >
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">KYC Under Review</h1>
          <p className="text-gray-500 mb-6">
            Your verification documents have been submitted and are being reviewed by our team. This usually takes 24–48 hours.
          </p>
          <div className="bg-amber-50 rounded-2xl p-4 text-left space-y-2 text-sm text-amber-800 border border-amber-100">
            <p><strong>Submitted:</strong> {kycData?.submittedAt ? new Date(kycData.submittedAt).toLocaleString() : 'Just now'}</p>
            <p><strong>Business:</strong> {kycData?.businessName}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-8 w-full py-3 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  if (kycStatus === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 border border-[#f3d7db] shadow-2xl shadow-[#a14b581a] text-center"
        >
          <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">KYC Approved!</h1>
          <p className="text-gray-500 mb-8">Your identity has been verified. You can now post ads on Unimart.</p>
          <button
            onClick={() => navigate('/seller')}
            className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all"
          >
            Go to Seller Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (kycStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 border border-red-100 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">KYC Rejected</h1>
          {kycData?.rejectionReason && (
            <div className="bg-red-50 rounded-2xl p-4 text-left text-sm text-red-700 border border-red-100 mb-6">
              <strong>Reason:</strong> {kycData.rejectionReason}
            </div>
          )}
          <p className="text-gray-500 mb-8">Please re-submit with clearer documents.</p>
          <button
            onClick={() => { setSelfieFile(null); setSelfiePreview(null); setIdFile(null); setIdPreview(null); setStep(1); }}
            className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all"
          >
            Re-submit KYC
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Selfie upload handler ──
  const handleSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  // ── ID doc upload handler ──
  const handleId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (user.is_email_verified === false) {
      toast.error('Please verify your email address before submitting KYC verification.');
      return;
    }
    if (!selfieFile || !idFile) {
      toast.error('Please upload both your selfie and ID document.');
      return;
    }
    if (!institutionEmail.trim()) {
      toast.error('Please enter your institution email.');
      return;
    }
    if (!businessName.trim()) {
      toast.error('Please enter your business or store name.');
      return;
    }
    if (!agreeSellerPolicies) {
      toast.error('Please confirm your enrollment and agree to the Seller Agreement.');
      return;
    }

    setLoading(true);
    try {
      const selfieBase64 = await fileToBase64(selfieFile);
      const idDocBase64 = await fileToBase64(idFile);

      // Record immutable acceptance of seller legal policies
      const { legalAcceptanceStorage } = await import('../../lib/api');
      legalAcceptanceStorage.recordAcceptance({
        userId: user.id || user.email,
        userEmail: user.email,
        documentId: 'seller-agreement',
        documentVersion: '0.1',
        userRole: 'Seller',
        acceptanceMethod: 'kyc_verification_form',
      });

      legalAcceptanceStorage.recordAcceptance({
        userId: user.id || user.email,
        userEmail: user.email,
        documentId: 'student-verification',
        documentVersion: '0.1',
        userRole: 'Seller',
        acceptanceMethod: 'kyc_verification_form',
      });

      await submitKYC({
        email: user.email,
        selfieBase64,
        idDocBase64,
        institutionEmail,
        businessName,
        mode,
      });

      // Also update local profile business name
      await updateProfile({ businessName });

      toast.success('KYC submitted! Your account is under review.');
      navigate('/profile');
    } catch {
      toast.error('Failed to submit KYC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Upload Photos', 'Your Details', 'Review & Submit'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf6f7] to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#a14b584d]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Identity Verification (KYC)</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            {mode === 'buyer_upgrade'
              ? 'Complete KYC to upgrade your account to a Seller.'
              : 'One-time verification required before you can post ads on Unimart.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  i + 1 < step ? 'bg-green-500 text-white' :
                  i + 1 === step ? 'bg-[#a14b58] text-white shadow-lg shadow-[#a14b584d]' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i + 1 < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold mt-1 ${i + 1 === step ? 'text-[#a14b58]' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-16 mx-1 mt-[-14px] transition-all ${i + 1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-[#f3d7db] shadow-2xl shadow-[#a14b581a]"
        >
          <AnimatePresence mode="wait">
            {/* ── Step 1: Photos ── */}
            {step === 1 && (
              <motion.div key="step1" className="space-y-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Upload Your Photos</h2>
                  <p className="text-sm text-gray-500">We need a clear selfie and your ID document.</p>
                </div>

                {/* Selfie */}
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-3">
                    Selfie Photo <span className="text-[#a14b58]">*</span>
                  </label>
                  <div
                    onClick={() => selfieRef.current?.click()}
                    className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      selfiePreview ? 'border-[#a14b58]' : 'border-gray-200 hover:border-[#a14b58] hover:bg-[#fcf6f7]'
                    }`}
                  >
                    {selfiePreview ? (
                      <>
                        <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-400">Click to upload selfie</p>
                        <p className="text-xs text-gray-300">JPG, PNG — face clearly visible</p>
                      </>
                    )}
                    <input ref={selfieRef} type="file" className="hidden" accept="image/*" onChange={handleSelfie} />
                  </div>
                </div>

                {/* ID Document */}
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-3">
                    Student ID or Ghana Card <span className="text-[#a14b58]">*</span>
                  </label>
                  <div
                    onClick={() => idRef.current?.click()}
                    className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      idPreview ? 'border-[#a14b58]' : 'border-gray-200 hover:border-[#a14b58] hover:bg-[#fcf6f7]'
                    }`}
                  >
                    {idPreview ? (
                      <>
                        <img src={idPreview} alt="ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-400">Click to upload ID document</p>
                        <p className="text-xs text-gray-300">Student ID card or Ghana Card</p>
                      </>
                    )}
                    <input ref={idRef} type="file" className="hidden" accept="image/*" onChange={handleId} />
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 rounded-2xl p-4 text-sm text-blue-700 border border-blue-100">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>All documents are stored securely and used only for verification purposes.</p>
                </div>

                <button
                  onClick={() => {
                    if (!selfieFile || !idFile) { toast.error('Please upload both photos.'); return; }
                    setStep(2);
                  }}
                  className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 2 && (
              <motion.div key="step2" className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Your Details</h2>
                  <p className="text-sm text-gray-500">Tell us about your institution and business.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Institution Email <span className="text-[#a14b58]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={institutionEmail}
                      onChange={e => setInstitutionEmail(e.target.value)}
                      placeholder="you@st.ug.edu.gh"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Must be your official student institution email.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Business / Store Name <span className="text-[#a14b58]">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Kofi's Gadgets Hub"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!institutionEmail.trim() || !businessName.trim()) {
                        toast.error('Please fill in all fields.');
                        return;
                      }
                      setStep(3);
                    }}
                    className="flex-[2] py-4 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Review & Submit ── */}
            {step === 3 && (
              <motion.div key="step3" className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Review Your Submission</h2>
                  <p className="text-sm text-gray-500">Please verify everything is correct before submitting.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl overflow-hidden h-32 border border-gray-100">
                    {selfiePreview && <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />}
                  </div>
                  <div className="rounded-2xl overflow-hidden h-32 border border-gray-100">
                    {idPreview && <img src={idPreview} alt="ID" className="w-full h-full object-cover" />}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Name</span>
                    <span className="font-bold text-gray-900">{user.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Institution Email</span>
                    <span className="font-bold text-gray-900 truncate ml-4">{institutionEmail}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Business Name</span>
                    <span className="font-bold text-gray-900">{businessName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Request Type</span>
                    <span className="font-bold text-gray-900 capitalize">{mode === 'buyer_upgrade' ? 'Upgrade to Seller' : 'First Ad Verification'}</span>
                  </div>
                </div>

                {/* Seller Agreement & Student Verification Checkbox */}
                <div className="p-4 bg-rose-50/70 rounded-2xl border border-[#f3d7db] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreeSellerPolicies"
                    checked={agreeSellerPolicies}
                    onChange={(e) => setAgreeSellerPolicies(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58] cursor-pointer"
                  />
                  <label htmlFor="agreeSellerPolicies" className="text-xs text-gray-700 cursor-pointer leading-relaxed">
                    I confirm that I am currently enrolled at a recognised tertiary institution in Ghana, that the information and documents I have provided are accurate, and that I agree to the{' '}
                    <Link to="/legal/seller-agreement" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                      Seller Agreement
                    </Link>{' '}
                    and{' '}
                    <Link to="/legal/student-verification" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                      Student Verification Policy
                    </Link>.
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] py-4 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Submit for Review
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
