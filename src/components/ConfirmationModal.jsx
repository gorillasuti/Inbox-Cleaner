import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-100 dark:border-zinc-800">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            <AlertTriangle size={16} />
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h3>
                    </div>
                    
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-2">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white transition-colors shadow-md ${isDangerous ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
