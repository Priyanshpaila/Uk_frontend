'use client';

import { useEffect, useState } from 'react';

declare global { interface Window { Ryft?: any } }

type Props = {
  clientSecret: string;
  amountMinor: number;
  returnUrl: string;
  publicKey: string;
};

export default function ReorderPaymentForm({ clientSecret, amountMinor, returnUrl, publicKey }: Props) {
  const [ready, setReady] = useState(false);
  const [payDisabled, setPayDisabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const init = () => {
      try {
        window.Ryft.init({
          publicKey,
          clientSecret,
          fieldCollection: { billingAddress: { display: 'full' } },
          applePay: { merchantName: 'Pharmacy Express', merchantCountryCode: 'GB' },
          googlePay: {
            merchantIdentifier: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
            merchantName: 'Pharmacy Express',
            merchantCountryCode: 'GB',
          },
        });

        window.Ryft.addEventHandler('cardValidationChanged', (e: any) => {
          setPayDisabled(!e?.isValid);
        });

        window.Ryft.addEventHandler('walletPaymentSessionResult', (e: any) => {
          handleResult(e?.paymentSession);
        });

        setReady(true);
      } catch (e: any) {
        setErr(e?.message || 'Failed to initialise payment form');
      }
    };

    if (window.Ryft) {
      init();
    } else {
      const s = document.createElement('script');
      s.src = 'https://embedded.ryftpay.com/v2/ryft.min.js';
      s.onload = init;
      s.onerror = () => setErr('Failed to load Ryft SDK');
      document.body.appendChild(s);
    }
  }, [clientSecret, publicKey]);

  function fmt(n: number) { return `£${(n / 100).toFixed(2)}`; }

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || payDisabled || processing) return;

    try {
      setProcessing(true);
      setErr(null);
      const session = await window.Ryft.attemptPayment();
      handleResult(session);
    } catch (e: any) {
      setErr(e?.message || 'Payment could not be attempted');
      setProcessing(false);
    }
  }

  function handleResult(session: any) {
    if (!session) {
      setErr('No payment session returned');
      setProcessing(false);
      return;
    }
    if (session.status === 'Approved' || session.status === 'Captured') {
      window.location.href = returnUrl;
      return;
    }
    const msg = session.lastError && window.Ryft?.getUserFacingErrorMessage
      ? window.Ryft.getUserFacingErrorMessage(session.lastError)
      : 'Payment failed. Please try again.';
    setErr(msg);
    setProcessing(false);
  }

  return (
    <form onSubmit={onPay} className="space-y-4">
      <button
        type="submit"
        disabled={!ready || payDisabled || processing}
        className="w-full px-6 py-3 rounded-full bg-emerald-600 text-white disabled:opacity-60"
      >
        {processing ? 'Processing…' : `Pay ${fmt(amountMinor)}`}
      </button>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <p className="text-xs text-gray-500">Apple Pay / Google Pay appear automatically on compatible devices.</p>
    </form>
  );
}