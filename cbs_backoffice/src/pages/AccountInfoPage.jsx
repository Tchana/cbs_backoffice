import { WhoAmI } from "../services/AccountInfoManagement";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import { User, Mail, UserCircle } from "lucide-react";

const AccountInfoPage = () => {
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const fetchAccountInfo = async () => {
      const accountInfo = await WhoAmI();
      setAccountInfo(accountInfo);
    };
    fetchAccountInfo();
  }, []);

  if (!accountInfo) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Account Information" />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Account Information" />

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl shadow-lg border border-gray-700 overflow-hidden"
        >
          {/* Banner Section */}
          <div className="relative h-32 sm:h-40 md:h-48 bg-gradient-to-r from-purple-600 to-indigo-600">
            <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
              <div className="relative">
                <img
                  src={accountInfo.pImage}
                  alt="Profile"
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-gray-800 bg-gray-800 object-cover"
                />
                <div className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-gray-800"></div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="pt-16 sm:pt-20 px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
            {/* User Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-100">
                  {accountInfo.firstName} {accountInfo.lastName}
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  User ID: {accountInfo.uuid}
                </p>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Email Card */}
              <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-700 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-all duration-200">
                <Mail className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-sm sm:text-base text-gray-100 truncate">
                    {accountInfo.email}
                  </p>
                </div>
              </div>

              {/* Name Card */}
              <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-700 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-all duration-200">
                <User className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="text-sm sm:text-base text-gray-100 truncate">
                    {accountInfo.firstName} {accountInfo.lastName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AccountInfoPage;
