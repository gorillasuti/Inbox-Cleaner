import React from 'react';
import { X, Zap, Crown, Trash2, RotateCcw, ShieldCheck, Mail } from 'lucide-react';

const HelpView = ({ onClose, t }) => {
    return (
        <div className="bg-white dark:bg-zinc-950 flex flex-col p-6 animate-in slide-in-from-right duration-300 overflow-y-auto h-full w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{t.faq_title}</h2>
                <button onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-zinc-800 p-1 rounded-full transition-colors text-zinc-900 dark:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-8">
                
                {/* Intro */}
                <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {t.faq_intro}
                </div>

                {/* Quick Scan */}
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{t.faq_quick_title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {t.faq_quick_desc}
                        </p>
                    </div>
                </div>

                {/* Deep Scan */}
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex-shrink-0 flex items-center justify-center text-violet-600 dark:text-violet-400">
                        <Crown size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{t.faq_deep_title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.faq_deep_desc }} />
                    </div>
                </div>

                {/* Unsubscribe */}
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400">
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{t.faq_unsub_title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.faq_unsub_desc }} />
                    </div>
                </div>

                {/* History */}
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <RotateCcw size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{t.faq_history_title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.faq_history_desc }} />
                    </div>
                </div>

                {/* Privacy */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2 text-zinc-900 dark:text-white font-bold text-sm">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        {t.faq_privacy_title}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {t.faq_privacy_desc}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default HelpView;
