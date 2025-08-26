// Support Form Component
import React from 'react';
import { motion } from 'framer-motion';
import { Send, AlertCircle, MessageCircle, Bug, HelpCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupportViewModel } from '../hooks/useSupportViewModel';
import { FileUpload } from './FileUpload';
import type { SupportTicketPriority, SupportTicketCategory } from '../types';

const priorityConfig = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800', icon: '' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: '' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800', icon: '' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', icon: '' }
};

const categoryConfig = {
  technical: { label: 'Technical Issue', icon: Bug, description: 'Bugs, errors, or technical problems' },
  account: { label: 'Account Support', icon: Settings, description: 'Account settings, billing, or access issues' },
  feature: { label: 'Feature Request', icon: MessageCircle, description: 'Suggestions for new features or improvements' },
  general: { label: 'General Inquiry', icon: HelpCircle, description: 'Questions or general support' }
};

export const SupportForm: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    updateFormData,
    validateField,
    submitTicket,
    clearForm
  } = useSupportViewModel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitTicket();
    if (success) {
      clearForm();
    }
  };

  const handleFileAdd = (files: File[]) => {
    updateFormData({
      attachments: [...formData.attachments, ...files]
    });
  };

  const handleFileRemove = (index: number) => {
    const newAttachments = formData.attachments.filter((_: File, i: number) => i !== index);
    updateFormData({ attachments: newAttachments });
  };

  return (
    <Card className="w-full h-full min-h-screen mx-auto">

      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-6 w-6 text-blue-600" />
          <CardTitle>Submit Support Ticket</CardTitle>
        </div>
        <CardDescription>
          Tell us about your issue and we'll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormData({ subject: e.target.value })}
              onBlur={() => validateField('subject')}
              placeholder="Brief description of your issue"
              className={errors.subject ? 'border-red-500' : ''}
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => updateFormData({ category: e.target.value as SupportTicketCategory })}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.category ? 'border-red-500' : ''}`}
            >
              <option value="">Select a category</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} - {config.description}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => updateFormData({ priority: e.target.value as SupportTicketPriority })}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.priority ? 'border-red-500' : ''}`}
            >
              <option value="">Select priority level</option>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData({ description: e.target.value })}
              onBlur={() => validateField('description')}
              placeholder="Please provide detailed information about your issue..."
              rows={6}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <FileUpload
              files={formData.attachments}
              onFilesAdd={handleFileAdd}
              onFileRemove={handleFileRemove}
              maxFiles={5}
              maxSize={10}
            />
            <p className="text-xs text-gray-500">
              Attach screenshots, logs, or other relevant files to help us resolve your issue faster.
            </p>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={clearForm}
              disabled={isSubmitting}
            >
              Clear Form
            </Button>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
