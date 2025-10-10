import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, BarChart3, Shield, Send } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ✅ Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h1
            className="text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Welcome to <span className="text-yellow-300">FixIt</span>
          </motion.h1>
          <motion.p
            className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Streamline your campus maintenance — report, track, and resolve
            issues faster. Empowering students, faculty, and staff to create a
            better environment together.
          </motion.p>
          <motion.div
            className="flex justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              to="/login"
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-full shadow hover:bg-gray-100 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-full shadow hover:bg-yellow-300 transition"
            >
              Register
            </Link>
          </motion.div>
        </div>
      </header>

      {/* ✅ Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12 text-gray-800">
            Why Use FixIt?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Send size={36} className="text-blue-600 mb-4" />,
                title: "Easy Ticketing",
                desc: "Submit maintenance requests in seconds — no paperwork needed.",
              },
              {
                icon: <Wrench size={36} className="text-green-600 mb-4" />,
                title: "Fast Resolution",
                desc: "Track your requests and see updates from fixers in real-time.",
              },
              {
                icon: <BarChart3 size={36} className="text-purple-600 mb-4" />,
                title: "Smart Analytics",
                desc: "Admins can monitor performance and identify recurring issues.",
              },
              {
                icon: <Shield size={36} className="text-orange-600 mb-4" />,
                title: "Secure Access",
                desc: "Role-based access ensures data integrity and privacy for everyone.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="bg-gray-50 p-6 rounded-2xl shadow hover:shadow-md transition"
                whileHover={{ scale: 1.05 }}
              >
                {f.icon}
                <h3 className="font-semibold text-lg mb-2 text-gray-800">
                  {f.title}
                </h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to make your campus better?
          </h2>
          <p className="text-blue-100 mb-6">
            Join FixIt today — manage and resolve maintenance issues with ease
            and transparency.
          </p>
          <Link
            to="/register"
            className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-full shadow hover:bg-yellow-300 transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ✅ Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm mt-auto">
        <p>
          © {new Date().getFullYear()} FixIt. All rights reserved. | Developed
          with ❤️ for smarter maintenance.
        </p>
      </footer>
    </div>
  );
}
