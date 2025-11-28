import React, { useState } from 'react';
import { CheckCircle, Zap, Search, Mail, ArrowRight } from 'lucide-react';

/**
 * Animated Onboarding Tutorial - Pure educational flow, no OAuth
 * Shows users how to use the app effectively
 */
const OnboardingFlow = ({ onComplete }) => {
    console.log("[OnboardingFlow] Component Rendered!");
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Inbox Cleaner! 🎉",
            subtitle: "Take control of your inbox in 3 simple steps",
            animation: "welcome",
            content: (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl">
                            <div className="text-4xl mb-2">🔍</div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Scan</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">Find all newsletters</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                            <div className="text-4xl mb-2">✅</div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Select</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">Pick what to remove</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-xl">
                            <div className="text-4xl mb-2">🚀</div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Clean</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">Unsubscribe instantly</p>
                       </div>
                    </div>
                </div>
            )
        },
        {
            title: "How to Scan Your Inbox 🔍",
            subtitle: "Choose between Quick Scan or Deep Scan",
            animation: "scan",
            content: (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={20} className="text-emerald-600 dark:text-emerald-400" />
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Quick Scan (Recommended)</h4>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 ml-8">
                            Scans the first page of your inbox. Perfect for regular maintenance (30 seconds).
                        </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3 mb-2">
                            <Search size={20} className="text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Deep Scan (Premium)</h4>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 ml-8">
                            Scans up to 50 pages. Find every single newsletter (~5 minutes).
                        </p>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            <strong>💡 Tip:</strong> Start with Quick Scan, then use Deep Scan monthly for thorough cleanup.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: "Unsubscribe Made Easy ✨",
            subtitle: "We handle the hard work for you",
            animation: "unsubscribe",
            content: (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">
                            1
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Select Newsletters</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Check the boxes next to unwanted senders
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 font-bold">
                            2
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Click Unsubscribe</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
We'll find and click unsubscribe buttons automatically
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400 font-bold">
                            3
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">Done!</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Removed from mailing lists in seconds
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "You're All Set! 🚀",
            subtitle: "Ready to clean your inbox",
            animation: "success",
            content: (
                <div className="space-y-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-bounce-slow">
                        <CheckCircle size={40} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Ready to Start!</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                            Navigate to your email provider and click the scan button to begin cleaning your inbox.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <Mail size={24} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-xs font-medium text-zinc-900 dark:text-white">Gmail</p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <Mail size={24} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                            <p className="text-xs font-medium text-zinc-900 dark:text-white">Outlook</p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800">
                {/* Progress bar */}
                <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8 animate-in slide-in-from-top duration-300">
                        <h2 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">
                            {currentStep.title}
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            {currentStep.subtitle}
                        </p>
                    </div>

                    {/* Step content */}
                    <div className="animate-in fade-in slide-in-from-bottom duration-300 mb-8">
                        {currentStep.content}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center gap-4">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                        )}
                        
                        <div className="flex gap-1.5 mx-auto">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        idx === step 
                                            ? 'w-8 bg-emerald-600' 
                                            : 'w-2 bg-zinc-300 dark:bg-zinc-700'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                if (isLastStep) {
                                    onComplete();
                                } else {
                                    setStep(step + 1);
                                }
                            }}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            {isLastStep ? 'Get Started' : 'Next'}
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Skip button */}
                    {!isLastStep && (
                        <div className="text-center mt-4">
                            <button
                                onClick={onComplete}
                                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                Skip tutorial
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default OnboardingFlow;
