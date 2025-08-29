// src/features/auth/components/LoginForm.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoginViewModel } from '../hooks/useLoginViewModel';
import { useNavigate, useLocation } from 'react-router-dom';

interface LoginFormProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  className = '',
}) => {
  const { viewModel, actions } = useLoginViewModel();
  const [showPassword, setShowPassword] = React.useState(false);
  
  // Add email validation state
  const [isValidEmail, setIsValidEmail] = React.useState(false);

  // Add email validation effect
  React.useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValidEmail(emailRegex.test(viewModel.formData.email));
  }, [viewModel.formData.email]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = () => {
    // Get the intended destination from location state, or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await actions.handleLogin();
    
    if (result.success) {
      onSuccess?.(result.data);
      handleLoginSuccess();
    } else if (result.error){
      onError?.(result.error);
    }
  };

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    loading: { scale: 0.95 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full max-w-md space-y-6 ${className}`}
    >
      <div className="text-center space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          Welcome Back
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-gray-600 dark:text-gray-400"
        >
          Sign in to your account to continue
        </motion.p>
      </div>
     {viewModel.status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertDescription className="text-red-700 dark:text-red-400">
              Login failed. Please check your credentials and try again.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field with Real-time Validation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-2"
        >
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </Label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
              viewModel.formData.email && !isValidEmail 
                ? 'text-red-400' 
                : isValidEmail 
                  ? 'text-green-400'
                  : 'text-gray-400'
            }`} />
            <motion.div variants={inputVariants} whileFocus="focus" initial="blur">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={viewModel.formData.email}
                onChange={(e) => actions.updateField('email', e.target.value)}
                className={`pl-10 pr-10 transition-all duration-200 ${
                  viewModel.validationErrors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : viewModel.formData.email && !isValidEmail
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : isValidEmail
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
                disabled={viewModel.status === 'loading'}
              />
            </motion.div>
            
            {/* Success Check Icon */}
            <AnimatePresence>
              {isValidEmail && !viewModel.validationErrors.email && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Real-time Email Validation Error */}
          <AnimatePresence>
            {viewModel.formData.email && !isValidEmail && !viewModel.validationErrors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-red-600 dark:text-red-400"
              >
                Please enter a valid email address
              </motion.p>
            )}
          </AnimatePresence>
          
          {/* Server-side Validation Error */}
          {viewModel.validationErrors.email && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-red-600">{viewModel.validationErrors.email}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Password Field (unchanged) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-2"
        >
          <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <motion.div variants={inputVariants} whileFocus="focus" initial="blur">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={viewModel.formData.password}
                onChange={(e) => actions.updateField('password', e.target.value)}
                className={`pl-10 pr-10 ${
                  viewModel.validationErrors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : ''
                }`}
                disabled={viewModel.status === 'loading'}
              />
            </motion.div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {viewModel.validationErrors.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-red-600">{viewModel.validationErrors.password}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Remember Me and Forgot Password (unchanged) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              className='cursor-pointer'
              checked={viewModel.formData.rememberMe}
              onCheckedChange={(checked) => actions.updateField('rememberMe', !!checked)}
              disabled={viewModel.status === 'loading'}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <button
            type="button"
            onClick={() => window.location.href = '/forgot-password'}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
          >
            Forgot password?
          </button>
        </motion.div>

        {/* Submit Button - Updated to consider email validation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <motion.div
            variants={buttonVariants}
            initial="idle"
            animate={viewModel.status === 'loading' ? 'loading' : 'idle'}
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              type="submit"
              disabled={!viewModel.canSubmit || !isValidEmail}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md transition-colors"
            >
              {viewModel.status === 'loading' ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 cursor-pointer">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
            <p className="flex items-center justify-center mt-4 text-black/80 text-sm">
              Don't have an account?{' '}
              <button 
              className="ml-1 text-black font-semibold hover:text-bg-sky-800 underline underline-offset-3 cursor-pointer"
              type="button"
              onClick={() => window.location.href = '/register'}
              >
                Sign up
              </button>
            </p>
          </motion.div>
        </motion.div>
      </form>
    </motion.div>
  );
};