// src/pages/LoginPage.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { LoginForm } from '@/features/auth/components/loginForm';
import type { AuthResponse } from '@/features/auth/models/auth.types';
import { GalleryVerticalEnd } from 'lucide-react';
import { ModeToggle } from "@/components/mode-toggle";

export const LoginPage: React.FC = () => {

  const handleLoginSuccess = (data: AuthResponse) => {
    console.log('Login successful:', data);
    // No need to manually redirect - AuthenticatedRedirect component will handle this
  };

  const handleLoginError = (error: string) => {
    console.error('Login error:', error);
    // You could show a toast notification here
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const 
      }
    }
  };

  const decorativeVariants = {
    initial: { scale: 0, rotate: 0 },
    animate: { 
      scale: 1, 
      rotate: 360,
      transition: {
        duration: 1,
        ease: 'easeOut' as const 
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-gray-900"
    >
      <div className="absolute top-4 right-4 z-20">
        <ModeToggle />
      </div>
      
      {/* Decorative Elements */}
      <motion.div
        variants={decorativeVariants}
        initial="initial"
        animate="animate"
        className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl dark:bg-white/5"
      />
      <motion.div
        variants={decorativeVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
        className="absolute top-1/4 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl dark:bg-white/10"
      />
      <motion.div
        variants={decorativeVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.4 }}
        className="absolute bottom-10 left-1/4 w-24 h-24 bg-white/8 rounded-full blur-xl dark:bg-white/10"
      />
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10"
      >
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="no-underline flex items-center gap-3 font-medium text-gray-900 dark:text-white text-lg">
            <div className="bg-primary text-primary-foreground flex items-center justify-center w-8 h-8 rounded-md">
              <GalleryVerticalEnd className="w-5 h-5" />
            </div>
            Fixit Inc.
          </div>
        </div>
        </motion.div>
        <motion.div
          variants={cardVariants}
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20"
        >
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center mt-6"
        >
          <div className="text-center text-black/80 dark:text-white/80 text-sm text-balance">
            By clicking continue, you agree to our <a href="/ToS" className="underline">Terms of Service</a>{" "}
            and <a href="/Privacy-policy" className="underline">Privacy Policy</a>.
          </div>
          
        </motion.div>
      </motion.div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default LoginPage;