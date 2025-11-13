'use client'

import { useState, useEffect } from 'react'

type Summary = {
  bookingRef: string
  serviceName: string
  totalPence: number
}

type Props = {
  summary: Summary
  assessmentId: string
  customerEmail: string
}

export default function ReorderPayBox(props: Props) {
  const { summary, assessmentId, customerEmail } = props
  const [ack, setAck] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const retBase = process.env.NEXT_PUBLIC_RETURN_URL_HTTPS
  const returnUrl = retBase ? `${retBase.replace(/\/+$/,'')}/checkout/return` : undefined

  useEffect(() => {
    const reset = () => setIsProcessing(false)
    document.addEventListener('visibilitychange', reset)
    return () => document.removeEventListener('visibilitychange', reset)
  }, [])

  async function handlePay() {
  // Open a named popup right away to beat popup blockers.
    const popup = window.open('', 'ryftpay', 'popup,width=520,height=760');

    // Optional: show a lightweight loading screen in the popup
    if (popup && popup.document) {
      try {
        // Set title and paint a minimal loading UI without writing full HTML tags
        popup.document.title = 'Secure payment';
        const bodyEl = popup.document.body || popup.document.createElement('body');
        bodyEl.setAttribute(
          'style',
          'font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'
        );
        bodyEl.innerHTML = '<div>Opening secure payment…</div>';
        if (!popup.document.body) {
          popup.document.appendChild(bodyEl);
        }
      } catch {}
    }

    try {
        setIsProcessing(true);

        const res = await fetch('/api/pay/ryft/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: summary.totalPence,
            currency: 'GBP',
            description: summary.serviceName,
            assessmentId,
            returnUrl,
            customerEmail,
        }),
        });

        const text = await res.text();
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        if (!res.ok) throw new Error(`session failed ${res.status} ${text}`);

        // Try common redirect fields from Ryft session responses
        let payUrl: string | undefined =
          data?.url ||
          data?.redirect_url ||
          data?.links?.redirect ||
          data?.hostedUrl ||
          data?.hosted_url ||
          undefined;

        // Fallback to embedded flow if session tokens are returned
        if (!payUrl && data?.clientSecret && data?.paymentSessionId) {
          payUrl = `${window.location.origin}/pay?ps=${encodeURIComponent(data.paymentSessionId)}&cs=${encodeURIComponent(data.clientSecret)}`;
        }

        if (!payUrl) {
          console.log('Ryft session created but no redirect URL returned', data);
          throw new Error('Payment session created but no redirect URL was returned.');
        }

        if (popup) {
        popup.location.replace(payUrl); // navigate the popup
        } else {
        window.location.href = payUrl;  // fallback
        }
    } catch (err: any) {
        console.error(err);
        try { popup?.close(); } catch {}
        alert(err?.message || 'Could not start payment session. Please try again.');
    } finally {
        setIsProcessing(false);
    }
    }

  const emailMissing = !customerEmail?.trim()

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={ack}
          onChange={e => setAck(e.target.checked)}
          className="h-4 w-4"
        />
        <span>Please tick this box for payment screen</span>
      </label>

      {ack && (
        <div className="rounded-xl border border-blue-100 bg-blue-50">
          <div className="p-6">
            <h3 className="text-xl font-semibold">Reorder summary</h3>

            <div className="mt-6 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Original booking</span>
                <span className="text-gray-700">{summary.bookingRef}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Services</span>
                <span className="text-gray-700">{summary.serviceName}</span>
              </div>
            </div>

            <div className="mt-6 h-px bg-blue-100" />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg">Total</span>
              <span className="text-2xl">£{(summary.totalPence / 100).toFixed(2)}</span>
            </div>

            {emailMissing && (
              <p className="mt-4 text-center text-xs text-red-600">
                GP email required before payment
              </p>
            )}

            <div className="mt-8 flex justify-center">
              <button
                onClick={handlePay}
                disabled={isProcessing || emailMissing}
                className="px-6 py-3 rounded-lg bg-emerald-600 text-white shadow hover:brightness-110 disabled:opacity-60"
              >
                {isProcessing ? 'Processing…' : 'Pay by card'}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              A new tab will open with a secure payment page to complete your payment
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
