import React, { useEffect, useState } from 'react';
import { Send, CheckCircle, XCircle, ShieldCheck, Mail, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import Lottie from 'lottie-react';
import confettiData from '../assets/confetti.json';

const UnsubscribeOverlay = ({ 
    isVisible, 
    total, 
    current, 
    successCount, 
    failCount, 
    currentSender, 
    manualUnsubscribes = [],
    onClose 
}) => {
    const isComplete = (successCount + failCount) === total && total > 0;
    const progress = total > 0 ? ((successCount + failCount) / total) * 100 : 0;
    const hasManualActions = manualUnsubscribes.length > 0;
    
    // CRITICAL: Only auto-close if it was a pure success (no manual steps required)
    useEffect(() => {
        if (isComplete && !hasManualActions && successCount > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, hasManualActions, successCount, onClose]);
    
    // Auto-close when manual actions list becomes empty after being populated
    useEffect(() => {
        if (isComplete && manualUnsubscribes.length === 0 && (successCount > 0 || failCount > 0)) {
            const timer = setTimeout(() => {
                onClose();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [manualUnsubscribes.length, isComplete, successCount, failCount, onClose]);

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-300 rounded-2xl overflow-hidden">
            
            {/* Success Confetti - Only if complete and no manual actions needed (or maybe show it anyway?) */}
            {isComplete && successCount > 0 && !hasManualActions && (
                <div className="absolute inset-0 pointer-events-none">
                    <Lottie animationData={confettiData} loop={false} />
                </div>
            )}

            <div className="w-full max-w-[90%] flex flex-col items-center text-center relative z-10 max-h-[90%] overflow-y-auto custom-scrollbar p-4">
                
                {/* Icon Animation */}
                <div className="mb-6 relative shrink-0">
                    {!isComplete ? (
                        <div className="relative">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center animate-pulse">
                                <Send size={32} className="text-emerald-600 dark:text-emerald-400 mr-1" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                                <Mail size={14} className="text-zinc-400" />
                            </div>
                        </div>
                    ) : (
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300 ${hasManualActions ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}>
                            {hasManualActions ? <AlertTriangle size={40} className="text-white" /> : <CheckCircle size={40} className="text-white" />}
                        </div>
                    )}
                </div>

                {/* Status Text */}
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                    {!isComplete ? "Unsubscribing..." : (hasManualActions ? "Action Required" : "Success!")}
                </h3>
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 min-h-[1.25rem]">
                    {!isComplete 
                        ? `Processing ${currentSender || 'sender'}...` 
                        : (hasManualActions 
                            ? `${manualUnsubscribes.length} unsubscribe link${manualUnsubscribes.length > 1 ? 's' : ''} ${manualUnsubscribes.length > 1 ? 'have' : 'has'} been opened in new ${manualUnsubscribes.length > 1 ? 'tabs' : 'tab'}.` 
                            : `Successfully unsubscribed from ${successCount} sender${successCount !== 1 ? 's' : ''}!`)}
                </p>

                {/* Progress Bar */}
                {!isComplete && (
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2 shrink-0">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Stats */}
                {!isComplete && (
                    <div className="flex gap-4 text-xs font-medium text-zinc-400 shrink-0">
                        <span className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-emerald-500" /> {successCount} Success
                        </span>
                        {failCount > 0 && (
                            <span className="flex items-center gap-1">
                                <XCircle size={12} className="text-red-500" /> {failCount} Failed
                            </span>
                        )}
                    </div>
                )}

                {/* Manual Actions List */}
                {isComplete && hasManualActions && (
                    <div className="w-full text-left bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800 p-4 mb-4 animate-in slide-in-from-bottom-4 duration-500 max-h-[70vh] flex flex-col">
                        <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                                    Action Required ({manualUnsubscribes.length})
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    These senders don't support automatic unsubscribe. Click "Move to Trash" to remove all their emails from your inbox.
                                </p>
                            </div>
                        </div>
                        
                        {/* Scrollable List Container */}
                        <div className="flex-1 overflow-y-auto max-h-96 mb-3 pr-1 custom-scrollbar">
                            <div className="flex flex-col gap-2">
                                {manualUnsubscribes.map((item, idx) => (
                                    <div key={item.email || idx} className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-medium text-sm truncate text-zinc-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{item.email}</div>
                                        </div>
                                        <button
                                            onClick={() => item.onTrash && item.onTrash(item)}
                                            className="shrink-0 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 shadow-md hover:shadow-lg"
                                        >
                                            <Trash2 size={14} />
                                            Move to Trash
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Trash All Remaining Button */}
                        {manualUnsubscribes.length > 1 && (
                            <button
                                onClick={async () => {
                                    // Trash all remaining items
                                    for (const item of manualUnsubscribes) {
                                        if (item.onTrash) {
                                            await item.onTrash(item);
                                        }
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <Trash2 size={16} />
                                Move All {manualUnsubscribes.length} to Trash
                            </button>
                        )}
                    </div>
                )}

                {/* Close Button (Only when complete) */}
                {isComplete && (
                    <button 
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg shrink-0"
                    >
                        {hasManualActions ? 'Close' : 'Done'}
                    </button>
                )}
            </div>

            {/* Trust Badge */}
            {!isComplete && (
                <div className="absolute bottom-6 flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wider font-medium opacity-60">
                    <ShieldCheck size={12} />
                    Secure Unsubscribe
                </div>
            )}
        </div>
    );
};

export default UnsubscribeOverlay;
