import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, CreditCard, Shield, Settings, Wallet } from "lucide-react";
import Header from "../components/common/Header";
import ToggleSwitch from "../components/common/ToggleSwitch";
import LoadingSpinner from "../components/common/LoadingSpinner";
import FinanceRecordsPanel from "../components/finance/FinanceRecordsPanel";
import { isAdmin } from "../lib/auth";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import {
  getFinanceSettings,
  setPaymentCollectionMode,
  setAccessBlockingMode,
} from "../services/SettingsManagement";
import {
  getLibraryFeeAmount,
  getSchoolFeeAmount,
  setLibraryFeeAmount as saveLibraryFeeAmount,
  setSchoolFeeAmount as saveSchoolFeeAmount,
} from "../services/PaymentManagement";

const SettingCard = ({ icon: Icon, title, children, color }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-gray-700 bg-gray-800/60 p-6"
  >
    <div className="mb-5 flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const ModeBadge = ({ mode }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      mode === "automatic"
        ? "bg-indigo-900/60 text-indigo-300"
        : "bg-amber-900/50 text-amber-300"
    }`}
  >
    {mode === "automatic" ? "Automatic" : "Manual"}
  </span>
);

const FINANCE_TABS = [
  { key: "settings", label: "Settings", icon: Settings },
  { key: "records", label: "Payment records", icon: BarChart3 },
];

const FinancePage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [activeTab, setActiveTab] = useState("settings");
  const [paymentMode, setPaymentMode] = useState("manual");
  const [accessMode, setAccessMode] = useState("manual");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [libraryFeeAmount, setLibraryFeeAmount] = useState(0);
  const [libraryFeeInput, setLibraryFeeInput] = useState("");
  const [savingLibraryFee, setSavingLibraryFee] = useState(false);
  const [schoolFeeAmount, setSchoolFeeAmount] = useState(0);
  const [schoolFeeInput, setSchoolFeeInput] = useState("");
  const [savingSchoolFee, setSavingSchoolFee] = useState(false);

  const loadSettings = async () => {
    try {
      const [settings, libraryFee, schoolFee] = await runWithLoader(() =>
        Promise.all([getFinanceSettings(), getLibraryFeeAmount(), getSchoolFeeAmount()])
      );
      setPaymentMode(settings.paymentMode);
      setAccessMode(settings.accessMode);
      setLibraryFeeAmount(libraryFee);
      setLibraryFeeInput(String(libraryFee || ""));
      setSchoolFeeAmount(schoolFee);
      setSchoolFeeInput(String(schoolFee || ""));
      setError(null);
    } catch (err) {
      console.error("Failed to load finance settings:", err);
      setError(err?.message || "Unable to load finance settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      setIsLoading(false);
      return;
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentModeChange = async (isAutomatic) => {
    const nextMode = isAutomatic ? "automatic" : "manual";
    if (nextMode === paymentMode) return;

    setSavingPayment(true);
    try {
      await runWithLoader(() => setPaymentCollectionMode(nextMode));
      setPaymentMode(nextMode);
      setError(null);
    } catch (err) {
      console.error("Failed to update payment mode:", err);
      setError(err?.message || "Failed to update payment collection mode.");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAccessModeChange = async (isAutomatic) => {
    const nextMode = isAutomatic ? "automatic" : "manual";
    if (nextMode === accessMode) return;

    setSavingAccess(true);
    try {
      await runWithLoader(() => setAccessBlockingMode(nextMode));
      setAccessMode(nextMode);
      setError(null);
    } catch (err) {
      console.error("Failed to update access mode:", err);
      setError(err?.message || "Failed to update access blocking mode.");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSchoolFeeSave = async () => {
    const amount = parseInt(schoolFeeInput, 10);
    if (Number.isNaN(amount) || amount < 0) {
      setError("School fee must be a valid amount (0 or more).");
      return;
    }

    setSavingSchoolFee(true);
    try {
      await runWithLoader(() => saveSchoolFeeAmount(amount));
      const savedAmount = await getSchoolFeeAmount();
      setSchoolFeeAmount(savedAmount);
      setSchoolFeeInput(String(savedAmount || ""));
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to update school fee.");
    } finally {
      setSavingSchoolFee(false);
    }
  };

  const handleLibraryFeeSave = async () => {
    const amount = parseInt(libraryFeeInput, 10);
    if (Number.isNaN(amount) || amount < 0) {
      setError("Library fee must be a valid amount (0 or more).");
      return;
    }

    setSavingLibraryFee(true);
    try {
      await runWithLoader(() => saveLibraryFeeAmount(amount));
      const savedAmount = await getLibraryFeeAmount();
      setLibraryFeeAmount(savedAmount);
      setLibraryFeeInput(String(savedAmount || ""));
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to update library fee.");
    } finally {
      setSavingLibraryFee(false);
    }
  };

  if (!isAdmin()) return <Navigate to="/course" replace />;

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Finance & Access" />

      <div
        className={`mx-auto p-6 space-y-6 ${
          activeTab === "records" ? "max-w-7xl" : "max-w-4xl"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {FINANCE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {activeTab === "records" ? (
          <FinanceRecordsPanel />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <>
        <SettingCard icon={Wallet} title="Payment Collection" color="#10B981">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Current mode</p>
              <ModeBadge mode={paymentMode} />
            </div>

            <ToggleSwitch
              label="Automatic payment collection"
              description={
                paymentMode === "automatic"
                  ? "Students pay through platform integrations (APIs). Manual recording is disabled."
                  : "Payments are recorded manually by admins in the backoffice. This is the active mode for now."
              }
              enabled={paymentMode === "automatic"}
              onChange={handlePaymentModeChange}
              disabled={savingPayment}
            />

            {paymentMode === "automatic" && (
              <p className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
                Automatic payment collection is not yet connected to payment APIs.
                Switch back to manual mode until integrations are configured.
              </p>
            )}
          </div>
        </SettingCard>

        <SettingCard icon={Shield} title="Student Access Blocking" color="#8B5CF6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Current mode</p>
              <ModeBadge mode={accessMode} />
            </div>

            <ToggleSwitch
              label="Automatic access blocking"
              description={
                accessMode === "automatic"
                  ? "Students with outstanding school fees are blocked from courses and assignments. Library access is included with school fees. Library users are blocked when library fees are outstanding."
                  : "Access is controlled manually per account from the Users page. Grant or deny access to each account individually."
              }
              enabled={accessMode === "automatic"}
              onChange={handleAccessModeChange}
              disabled={savingAccess}
            />

            <p className="text-sm text-gray-500">
              Per-account overrides are available on each student&apos;s profile
              in the Users section — grant access, deny access, or reset to default.
            </p>
          </div>
        </SettingCard>

        <SettingCard icon={CreditCard} title="Fee Settings" color="#F59E0B">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200">
                Student school fee (XAF)
              </label>
              <p className="mt-1 text-sm text-gray-400">
                Flat annual school fee for students. Includes library access. Students may pay
                in installments; access blocking uses the remaining balance.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={schoolFeeInput}
                  onChange={(e) => setSchoolFeeInput(e.target.value)}
                  className="w-40 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  disabled={savingSchoolFee}
                />
                <button
                  type="button"
                  onClick={handleSchoolFeeSave}
                  disabled={savingSchoolFee}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {savingSchoolFee ? "Saving..." : "Save"}
                </button>
                <span className="text-sm text-gray-500">
                  Current: {schoolFeeAmount.toLocaleString()} XAF
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200">
                Library user fee (XAF)
              </label>
              <p className="mt-1 text-sm text-gray-400">
                Flat fee for users registered as library members only. Students paying
                school fees already include library access. Library users may pay in installments.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={libraryFeeInput}
                  onChange={(e) => setLibraryFeeInput(e.target.value)}
                  className="w-40 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  disabled={savingLibraryFee}
                />
                <button
                  type="button"
                  onClick={handleLibraryFeeSave}
                  disabled={savingLibraryFee}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {savingLibraryFee ? "Saving..." : "Save"}
                </button>
                <span className="text-sm text-gray-500">
                  Current: {libraryFeeAmount.toLocaleString()} XAF
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Record student school fee and library user payments from the Users page, or review
              them under Payment records.
            </p>
          </div>
        </SettingCard>
          </>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
