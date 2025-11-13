'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    Ryft?: any;
  }
}

export default function ClientPayPage() {
  // optional runtime fallback if env is missing
  // @ts-ignore
  const runtimePk = typeof window !== 'undefined' ? (window.__RYFT_PK as string | undefined) : undefined;

  const params = useSearchParams();
  const debug = params?.get('debug') === '1';
  const paymentSessionId = params?.get('ps') || '';
  const originStr = typeof window !== 'undefined' ? window.location.origin : '';
  // From your fallback link (?ps=...&cs=...)
  const pkFromUrl = params?.get('pk') || '';
  const pubKey = (process.env.NEXT_PUBLIC_RYFT_PUBLIC_KEY as string) || pkFromUrl || runtimePk || '';
  const clientSecret = params?.get('cs') || '';

  const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'My Business';
  const merchantCountry = process.env.NEXT_PUBLIC_MERCHANT_COUNTRY || 'GB';
  const gpayMerchantId = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'merchant_123';

  const [sdkReady, setSdkReady] = useState(false);
  const [payDisabled, setPayDisabled] = useState(true);
  const errorRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  async function createFreshSessionAndRedirect() {
    try {
      const amountMinor = Number(params.get('amount') || 16999);
      const description = params.get('description') || 'Pharmacy payment';
      const customerEmail = (typeof window !== 'undefined' && localStorage.getItem('patient_email')) || params.get('email') || '';
      const reference = params.get('reference') || `REF${Date.now()}`;
      const returnUrl = `${location.origin}/checkout/reorder/return`;

      const res = await fetch('/api/pay/ryft/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          amount: amountMinor,
          currency: 'GBP',
          description,
          customerEmail,
          reference,
          returnUrl,
          metadata: { flow: 'reorder' },
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        console.error('[Ryft] create session failed', errTxt);
        showError('Could not create payment session');
        return;
      }

      const { paymentSessionId, clientSecret } = await res.json();
      if (!paymentSessionId || !clientSecret) {
        showError('Missing session details');
        return;
      }

      const url = new URL(location.href);
      url.searchParams.set('ps', paymentSessionId);
      url.searchParams.set('cs', clientSecret);
      url.searchParams.delete('fresh');
      router.replace(url.toString());
    } catch (e) {
      console.error('[Ryft] fresh session error', e);
      showError('Failed to start payment session');
    }
  }

  // Add a new useEffect BEFORE the existing one
  useEffect(() => {
    const cs = params?.get('cs');
    const forceFresh = params?.get('fresh') === '1';
    if (!cs || forceFresh) {
      createFreshSessionAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard: only init when we have a key + client secret
  const readyToInit = useMemo(() => Boolean(pubKey && clientSecret), [pubKey, clientSecret]);

  function showError(msg: string) {
    if (errorRef.current) errorRef.current.textContent = msg;
  }
  function clearError() {
    if (errorRef.current) errorRef.current.textContent = '';
  }

  useEffect(() => {
    if (!sdkReady || !readyToInit || !window.Ryft) return;

    console.log('[Ryft] init starting', { sdkReady, readyToInit, pk: pubKey?.slice(0,10), hasCS: !!clientSecret, origin: originStr });

    try {
      window.Ryft.init({
        publicKey: pubKey,
        clientSecret, // enables wallets
        applePay: {
          merchantName,
          merchantCountryCode: merchantCountry,
        },
        googlePay: {
          merchantIdentifier: gpayMerchantId,
          merchantName,
          merchantCountryCode: merchantCountry,
        },
        fieldCollection: { billingAddress: { display: 'full' } },
        style: {
          borderRadius: 8,
          backgroundColor: '#fff',
          borderColor: '#e5e7eb',
          padding: 12,
          color: '#111827',
          focusColor: '#111827',
          bodyColor: '#ffffff',
        },
      });


      // Mount card element into our placeholder if the SDK exposes mount
      if (typeof window.Ryft.mount === 'function') {
        try {
          window.Ryft.mount('#ryft-card');
          console.log('[Ryft] card mounted');
        } catch (e) {
          console.warn('[Ryft] mount failed', e);
        }
      }

      window.Ryft.addEventHandler('cardValidationChanged', (e: any) => {
        setPayDisabled(!e?.isValid);
      });

      window.Ryft.addEventHandler('walletPaymentSessionResult', (e: any) => {
        handlePaymentResult(e.paymentSession);
      });
    } catch (err: any) {
      showError(err?.message || 'Failed to initialise payment form.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, readyToInit]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();

    try {
      const ps = await window.Ryft!.attemptPayment();
      handlePaymentResult(ps);
    } catch (err: any) {
      showError(err?.message || 'Payment could not be attempted.');
    }
  }

  function handlePaymentResult(paymentSession: any) {
    if (!paymentSession) {
      showError('No payment session returned.');
      return;
    }
    if (paymentSession.status === 'Approved' || paymentSession.status === 'Captured') {
      // If your backend set returnUrl, Ryft may auto-redirect. If not, do our own:
      window.location.href = `/checkout/return?ps=${encodeURIComponent(paymentSession.id)}`;
      return;
    }
    if (paymentSession.lastError) {
      const userFacing = window.Ryft!.getUserFacingErrorMessage(paymentSession.lastError);
      showError(userFacing || 'Payment failed. Please try again.');
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* Ryft SDK */}
      <Script
        src="https://embedded.ryftpay.com/v2/ryft.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          setSdkReady(true);
          try {
            // extra visibility when the SDK is ready
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            console.log('[Ryft] sdk loaded', window.Ryft?.version);
          } catch {}
        }}
        onError={() => showError('Failed to load Ryft SDK')}
      />
      <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Pay securely</h1>
        {debug && (
          <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: 12, padding: 10, margin: '12px 0' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Debug</div>
            <div>pk: {pubKey ? pubKey.slice(0, 12) + '…' : '(missing)'}</div>
            <div>ps: {paymentSessionId ? paymentSessionId.slice(0, 18) + '…' : '(missing)'}</div>
            <div>cs: {clientSecret ? 'present' : '(missing)'}</div>
            <div>origin: {originStr}</div>
            <div>sdkReady: {String(sdkReady)} readyToInit: {String(readyToInit)}</div>
          </div>
        )}
        {!readyToInit ? (
          <div style={{ color: '#b91c1c' }}>
            Missing client secret or public key. This page will auto-create a session if you reload with fresh=1. If it persists, set NEXT_PUBLIC_RYFT_PUBLIC_KEY or pass ?pk=your_public_key in the URL.
          </div>
        ) : (
          <form id="ryft-pay-form" onSubmit={onSubmit}>
            <div id="ryft-card" style={{ marginBottom: 12 }} />
            {/* Ryft injects its iframe above this button */}
            <button
              id="pay-btn"
              type="submit"
              onClick={(ev) => { /* mirror submit for safety */ if (ev) { /* no-op */ } }}
              disabled={payDisabled}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 8,
                background: payDisabled ? '#9ca3af' : '#10b981',
                color: 'white',
                fontWeight: 600,
              }}
            >
              PAY NOW
            </button>
            <div id="ryft-pay-error" ref={errorRef} style={{ marginTop: 10, color: '#b91c1c' }} />
            <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
              Cards, Apple Pay, and Google Pay are supported.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}