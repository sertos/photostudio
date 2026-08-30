import React from 'react';

interface Props {
  isVisible: boolean;
  message: string;
}

export const ProcessingOverlay: React.FC<Props> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
           <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
           <div className="absolute inset-2 border-b-4 border-purple-500 rounded-full animate-spin direction-reverse"></div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Processing</h3>
        <p className="text-slate-400 animate-pulse">{message}</p>
      </div>
    </div>
  );
};