import React from "react";
import { CheckCircle, MessageSquare } from "lucide-react";
interface EnrollmentSuccessScreenProps {
  firstName: string;
  lastName: string;
  phone: string;
  /** Patient agreed to WhatsApp alerts — welcome + login details are sent there. */
  whatsappOptIn?: boolean;
  onEnrollAnother: () => void;
}

export const EnrollmentSuccessScreen: React.FC<EnrollmentSuccessScreenProps> = ({
  firstName,
  lastName,
  phone,
  whatsappOptIn = true,
  onEnrollAnother,
}) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-fade-in">
    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20 animate-bounce-short">
      <CheckCircle className="w-12 h-12 text-white" strokeWidth={3} />
    </div>
    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Registration Complete</h2>
    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mb-6">
      <span className="font-semibold text-slate-900 dark:text-white">
        {firstName} {lastName}
      </span>{" "}
      has been successfully enrolled.
    </p>

    <div
      className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900 mb-8 max-w-md w-full animate-fade-in"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="flex items-start gap-3">
        <MessageSquare className="text-blue-500 mt-1" size={20} />
        <div className="text-left">
          <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">
            {whatsappOptIn ? 'Welcome sent' : 'Login details sent'}
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-snug">
            {whatsappOptIn ? (
              <>
                A <strong>welcome message on WhatsApp</strong> plus login PIN and portal link were sent to{' '}
                <strong>{phone}</strong>. An SMS backup with the same credentials was also sent where
                SMS is configured.
              </>
            ) : (
              <>
                An SMS has been sent to <strong>{phone}</strong> with their login PIN and app link (
                WhatsApp unchecked on consent). They can log in immediately.
              </>
            )}
          </p>
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={onEnrollAnother}
      className="px-8 py-3 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-full font-semibold transition-all shadow-lg shadow-brand-500/20"
    >
      Enroll Next Mother
    </button>
  </div>
);
