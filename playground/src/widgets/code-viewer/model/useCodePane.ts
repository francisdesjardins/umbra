import { use } from 'react';
import { CodePaneContext } from '@/app/providers/CodePaneProvider/CodePaneContext';

export const useCodePane = () => {
  const context = use(CodePaneContext);
  if (!context) {
    throw new Error('useCodePane must be used within CodePaneProvider');
  }
  return context;
};
