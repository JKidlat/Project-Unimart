import React, { useState } from 'react';
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { universities } from '../data/mockData';
import { toast } from 'sonner';

export const Verification: React.FC = () => {
  const { user, updateProfile } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [selectedUni, setSelectedUni] = useState(user?.university || universities[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error("Please enter your Student ID number");
      return;
    }
    setSubmitted(true);
    toast.success("Verification documents submitted for review!");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#fcf6f7] rounded-3xl flex items-center justify-center text-[#a14b58] mx-auto mb-4 border border-[#f3d7db]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Student Verification Center</h1>
        <p className="text-gray-500">
          Get verified to unlock verified seller mode, trust badges, and unrestricted trading.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Under Review</h2>
          <p className="text-gray-500 mb-6">
            Our campus ambassadors review ID submissions within 24 hours. You'll receive a notification once verified!
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl text-left text-sm space-y-2 text-gray-600">
            <p><strong>Student ID:</strong> {studentId}</p>
            <p><strong>Institution:</strong> {selectedUni}</p>
            <p><strong>Status:</strong> <span className="text-amber-600 font-bold">Pending Review</span></p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">University Institution</label>
            <select
              value={selectedUni}
              onChange={(e) => setSelectedUni(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
            >
              {universities.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Student ID Number</label>
            <input
              type="text"
              required
              placeholder="e.g. 10928374"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Upload Student ID Card (Front)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">Click to upload photo or document</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG or PDF up to 5MB</p>
              <input type="file" className="hidden" accept="image/*,.pdf" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            Submit for Verification
          </button>
        </form>
      )}
    </div>
  );
};
