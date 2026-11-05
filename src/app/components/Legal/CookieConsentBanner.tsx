import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Shield, Cookie, Check, X, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

export interface CookiePreferences {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: string;
  version: string;
}

const COOKIE_STORAGE_KEY = 'unimart_cookie_consent';
const CURRENT_COOKIE_VERSION = '1.0';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Preference category states
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [preferencesConsent, setPreferencesConsent] = useState(false);
  const [advertisingConsent, setAdvertisingConsent] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Check if consent has already been recorded
    try {
      const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!stored) {
        setIsVisible(true);
      } else {
        const parsed: CookiePreferences = JSON.parse(stored);
        // Apply existing preferences
        setAnalyticsConsent(!!parsed.analytics);
        setPreferencesConsent(!!parsed.preferences);
        setAdvertisingConsent(!!parsed.advertising);
      }
    } catch (e) {
      setIsVisible(true);
    }

    // Register global trigger for reopening cookie settings
    (window as any).openCookiePreferences = () => {
      setShowPreferencesModal(true);
      setIsVisible(false);
    };

    return () => {
      delete (window as any).openCookiePreferences;
    };
  }, []);

  const saveConsent = (prefs: Partial<CookiePreferences>) => {
    const consentRecord: CookiePreferences = {
      necessary: true, // Always true
      preferences: !!prefs.preferences,
      analytics: !!prefs.analytics,
      advertising: !!prefs.advertising,
      timestamp: new Date().toISOString(),
      version: CURRENT_COOKIE_VERSION,
    };

    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(consentRecord));

    // Dispatch custom event for tracking listeners to react
    window.dispatchEvent(
      new CustomEvent('unimartCookieConsentUpdated', {
        detail: consentRecord,
      })
    );

    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    setAnalyticsConsent(true);
    setPreferencesConsent(true);
    setAdvertisingConsent(true);
    saveConsent({
      preferences: true,
      analytics: true,
      advertising: true,
    });
  };

  const handleRejectOptional = () => {
    setAnalyticsConsent(false);
    setPreferencesConsent(false);
    setAdvertisingConsent(false);
    saveConsent({
      preferences: false,
      analytics: false,
      advertising: false,
    });
  };

  const handleSaveCustomPreferences = () => {
    saveConsent({
      preferences: preferencesConsent,
      analytics: analyticsConsent,
      advertising: advertisingConsent,
    });
  };

  const toggleDetail = (key: string) => {
    setDetailsExpanded(detailsExpanded === key ? null : key);
  };

  return (
    <>
      {/* Bottom Floating Cookie Banner */}
      {isVisible && !showPreferencesModal && (
        <div 
          role="region" 
          aria-label="Cookie Consent Banner"
          className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50 animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl shadow-gray-950/10 dark:shadow-black/50 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-[#a14b58] rounded-2xl shrink-0">
                <Cookie className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Privacy & Cookie Preferences</span>
                  <span className="text-[10px] font-semibold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    Act 843
                  </span>
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Unimart uses strictly necessary cookies for platform security, student session continuity, and core operations. Optional analytics and advertising cookies are only activated with your informed consent.
                </p>
                <div className="mt-2 text-xs flex items-center gap-3">
                  <Link
                    to="/legal/cookies"
                    className="text-[#a14b58] dark:text-[#f48fb1] font-medium hover:underline"
                  >
                    Cookie Policy
                  </Link>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <Link
                    to="/legal/privacy"
                    className="text-[#a14b58] dark:text-[#f48fb1] font-medium hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                Manage Preferences
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold transition-colors"
              >
                Reject Optional
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2.5 rounded-xl bg-[#a14b58] text-white hover:bg-[#883d49] text-xs font-semibold transition-all shadow-sm"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-[#a14b58] rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="cookie-preferences-title" className="text-lg font-bold text-gray-900 dark:text-white">
                    Manage Cookie Preferences
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ghana Data Protection Act, 2012 (Act 843)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Categories */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1 text-sm">
              {/* Strictly Necessary */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Strictly Necessary Cookies
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Always Active
                      </span>
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Required for basic platform security, login authentication, cart preservation, and CSRF protection.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    className="w-5 h-5 rounded text-[#a14b58] cursor-not-allowed opacity-75"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-gray-900 dark:text-white block">
                      Preference & Localization Cookies
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enables the site to remember your display preferences, dark/light theme, and campus filter choices.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferencesConsent}
                      onChange={(e) => setPreferencesConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#a14b58]"></div>
                  </label>
                </div>
              </div>

              {/* Analytics */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        Analytics Technologies
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleDetail('analytics')}
                        className="text-xs text-[#a14b58] flex items-center hover:underline"
                      >
                        {detailsExpanded === 'analytics' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Helps us understand how users navigate the marketplace to improve performance. Google Analytics remains blocked until accepted.
                    </p>
                    {detailsExpanded === 'analytics' && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        Student IDs, student credentials, and private messages are strictly excluded from all analytics telemetry.
                      </p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#a14b58]"></div>
                  </label>
                </div>
              </div>

              {/* Advertising */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-gray-900 dark:text-white block">
                      Advertising & Conversion Technologies
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Measures conversion efficiency for marketing campaigns. Planned for Google Ads integration; blocked by default.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advertisingConsent}
                      onChange={(e) => setAdvertisingConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#a14b58]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/legal/cookies"
                className="text-xs text-[#a14b58] font-semibold hover:underline"
              >
                Read Complete Cookie Policy
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold transition-colors"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomPreferences}
                  className="px-5 py-2 rounded-xl bg-[#a14b58] text-white hover:bg-[#883d49] text-xs font-semibold transition-colors shadow-sm"
                >
                  Save Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
