// Feedback Form Component
import React from 'react';
import { motion } from 'framer-motion';
import { Send, AlertCircle, Heart, Star, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeedbackViewModel } from '@/features/support/hooks/useFeedbackViewModel';
import { StarRating } from './StarRating';
import { FileUpload } from './FileUpload';
import type { FeedbackType } from '../types';

const feedbackTypeConfig = {
  'bug-report': { label: 'Bug Report', icon: AlertCircle, color: 'text-red-600', description: 'Report a bug or issue' },
  'feature-request': { label: 'Feature Request', icon: Star, color: 'text-blue-600', description: 'Suggest a new feature' },
  'general': { label: 'General Feedback', icon: MessageCircle, color: 'text-green-600', description: 'General comments or suggestions' },
  'complaint': { label: 'Complaint', icon: AlertCircle, color: 'text-orange-600', description: 'Report a problem or concern' },
  'compliment': { label: 'Compliment', icon: Heart, color: 'text-pink-600', description: 'Share positive feedback' }
};

export const FeedbackForm: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    updateFormData,
    validateField,
    submitFeedback,
    clearForm
  } = useFeedbackViewModel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitFeedback();
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
          <Heart className="h-6 w-6 text-pink-600" />
          <CardTitle>Share Your Feedback</CardTitle>
        </div>
        <CardDescription>
          Help us improve by sharing your thoughts, suggestions, or reporting issues.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Feedback Type *</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => updateFormData({ type: e.target.value as FeedbackType })}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.type ? 'border-red-500' : ''}`}
            >
              <option value="">Select feedback type</option>
              {Object.entries(feedbackTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} - {config.description}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              onBlur={() => validateField('title')}
              placeholder="Brief title for your feedback"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Overall Rating (Optional)</Label>
            <StarRating
              rating={formData.rating || 0}
              onRatingChange={(rating) => updateFormData({ rating })}
              size="lg"
            />
            <p className="text-xs text-gray-500">
              Rate your overall experience (1 = Poor, 5 = Excellent)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData({ description: e.target.value })}
              onBlur={() => validateField('description')}
              placeholder="Please share your detailed feedback..."
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
              maxFiles={3}
              maxSize={5}
            />
            <p className="text-xs text-gray-500">
              Attach screenshots or files to support your feedback.
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) => updateFormData({ isAnonymous: checked as boolean })}
            />
            <Label htmlFor="anonymous" className="text-sm">
              Submit anonymously (your identity will not be shared)
            </Label>
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
                    Submit Feedback
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
