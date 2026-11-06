import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Building,
  Key,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Download,
  AlertCircle,
  Laptop,
  Layers,
} from 'lucide-react';
import { DeviceLicense, LicenseInvoice } from '../../types';
import { deviceBindingService } from '../../services/deviceBindingService';

interface PodoLoadDevicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (license: DeviceLicense, invoice: LicenseInvoice) => void;
  initialPlan?: 'dual' | 'hospital' | 'enterprise' | 'add_seat';
  lockedDeviceId?: string;
}

export const PodoLoadDevicePaymentModal: React.FC<PodoLoadDevicePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPlan = 'add_seat',
  lockedDeviceId,
}) => {
  const currentLicense = deviceBindingService.getDeviceLicense();
  const currentDevice = deviceBindingService.getCurrentDeviceInfo();

  const [selectedPlan, setSelectedPlan] = useState<'add_seat' | 'dual' | 'hospital' | 'enterprise'>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('monthly');
  const [paymentTab, setPaymentTab] = useState<'card' | 'po' | 'voucher'>('card');

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('889');
  const [cardName, setCardName] = useState('Dr. Specialist / Clinic Director');
  const [postalCode, setPostalCode] = useState('94103');

  const [poNumber, setPoNumber] = useState('PO-2026-MED-8419');
  const [taxId, setTaxId] = useState('US-MED-994102');
  const [billingEmail, setBillingEmail] = useState('billing@technomind.health');

  const [voucherKey, setVoucherKey] = useState('');

  // Processing & Success states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<LicenseInvoice | null>(null);
  const [completedLicense, setCompletedLicense] = useState<DeviceLicense | null>(null);

  if (!isOpen) return null;

  // Plan pricing matrix
  const planInfo = {
    add_seat: {
      name: '+1 Device Station Seat',
      description: 'Add an extra authorized clinical terminal to your facility',
      monthlyPrice: 29,
      lifetimePrice: 199,
      targetQuota: currentLicense.maxAllowedDevices + 1,
    },
    dual: {
      name: 'Dual-Station Pack (2 Devices)',
      description: 'Primary Diagnostic Workstation + Dedicated Scanning Terminal',
      monthlyPrice: 49,
      lifetimePrice: 299,
      targetQuota: Math.max(2, currentLicense.maxAllowedDevices),
    },
    hospital: {
      name: 'Hospital Multi-Department (5 Devices)',
      description: 'Fleet license for Podiatry, Diabetes Clinic & Biomechanics Labs',
      monthlyPrice: 99,
      lifetimePrice: 599,
      targetQuota: Math.max(5, currentLicense.maxAllowedDevices),
    },
    enterprise: {
      name: 'Enterprise Fleet (Unlimited)',
      description: 'Unlimited terminals across entire healthcare institution network',
      monthlyPrice: 199,
      lifetimePrice: 1299,
      targetQuota: 999,
    },
  };

  const activePlanMeta = planInfo[selectedPlan];
  const totalAmount = billingCycle === 'monthly' ? activePlanMeta.monthlyPrice : activePlanMeta.lifetimePrice;

  const handleProcessPayment = () => {
    setPaymentError(null);
    setIsProcessing(true);
    setProcessingStage('Encrypting hardware terminal token (FPR-SHA256)...');

    setTimeout(() => {
      setProcessingStage('Connecting to Clinical Gateway Authorization API...');
      setTimeout(() => {
        setProcessingStage('Allocating cryptographic multi-device license certificate...');
        setTimeout(() => {
          let result;
          if (paymentTab === 'voucher') {
            const voucherRes = deviceBindingService.redeemLicenseKey(voucherKey || 'PODO-DEV2-MULTI-2026');
            if (!voucherRes.success) {
              setIsProcessing(false);
              setPaymentError(voucherRes.message);
              return;
            }
            result = {
              success: true,
              license: voucherRes.license!,
              invoice: voucherRes.license!.invoices[0],
            };
          } else {
            result = deviceBindingService.upgradeLicense(selectedPlan, {
              method: paymentTab,
              amount: totalAmount,
              cardNumber: paymentTab === 'card' ? cardNumber : undefined,
              poNumber: paymentTab === 'po' ? poNumber : undefined,
              billingCycle,
            });
          }

          setIsProcessing(false);
          setCompletedInvoice(result.invoice);
          setCompletedLicense(result.license);
        }, 600);
      }, 600);
    }, 600);
  };

  const handleFinishAndActivate = () => {
    if (completedLicense && completedInvoice) {
      onSuccess(completedLicense, completedInvoice);
    }
    onClose();
  };

  return (
    <div className="podoload-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="podoload-modal-box"
        style={{ maxWidth: '680px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="podoload-modal-header" style={{ padding: '0.9rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f766e',
              }}
            >
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0c2328' }}>
                Multi-Device Hardware License Expansion
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Bind additional diagnostic workstations, scanning pods, and doctor terminals
              </p>
            </div>
          </div>
          <button
            type="button"
            className="podoload-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {completedInvoice ? (
            /* SUCCESS CONFIRMATION STATE */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>
                Device License Successfully Expanded!
              </h4>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: '#475569', maxWidth: '480px' }}>
                Hardware station <strong>{currentDevice.name} ({currentDevice.id})</strong> is now cryptographically bound and authorized to access clinical records.
              </p>

              {/* Receipt Summary Box */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#64748b' }}>Invoice Reference:</span>
                  <strong style={{ color: '#0f172a' }}>{completedInvoice.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>License Plan:</span>
                  <strong style={{ color: '#0f172a' }}>{completedInvoice.description}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Authorized Terminals Quota:</span>
                  <strong style={{ color: '#0f766e' }}>{completedLicense?.maxAllowedDevices} Active Stations</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid:</span>
                  <strong style={{ color: '#16a34a' }}>${completedInvoice.amount}.00 USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Mode:</span>
                  <span>{completedInvoice.paymentMethod}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary"
                  onClick={() => alert(`Receipt #${completedInvoice.id} sent to billing records.`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleFinishAndActivate}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 1.25rem' }}
                >
                  <span>Enter Clinical System</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* PROCESSING LOADER STATE */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #ccfbf1',
                  borderTopColor: '#0d9488',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: '1.25rem',
                }}
              />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#0c2328' }}>
                Processing Terminal Authorization...
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>
                {processingStage}
              </p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            /* ORDER & PAYMENT SELECTION STATE */
            <>
              {/* Notice Banner */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.76rem',
                  color: '#115e59',
                }}
              >
                <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <strong>Hardware Station Binding:</strong> Single-device medical regulation (IEC 62304 / ISO 13485) locks each terminal to prevent unauthorized multi-site data exposure. Upgrading expands your clinic's authorized terminal fleet.
                </div>
              </div>

              {/* Step 1: Choose License Expansion Tier */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>
                    1. Select License Expansion Plan
                  </label>
                  {/* Billing Frequency Toggle */}
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: billingCycle === 'monthly' ? '#fff' : 'transparent',
                        color: billingCycle === 'monthly' ? '#0f766e' : '#64748b',
                        boxShadow: billingCycle === 'monthly' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('lifetime')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: billingCycle === 'lifetime' ? '#fff' : 'transparent',
                        color: billingCycle === 'lifetime' ? '#0f766e' : '#64748b',
                        boxShadow: billingCycle === 'lifetime' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Perpetual Lifetime (Save 35%)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                  {(['add_seat', 'dual', 'hospital', 'enterprise'] as const).map((key) => {
                    const info = planInfo[key];
                    const isSelected = selectedPlan === key;
                    const price = billingCycle === 'monthly' ? `$${info.monthlyPrice}/mo` : `$${info.lifetimePrice} one-time`;

                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedPlan(key)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0c2328' }}>
                            {info.name}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e' }}>
                            {price}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', lineHeight: 1.35 }}>
                          {info.description}
                        </p>
                        <div style={{ fontSize: '0.66rem', color: '#0284c7', fontWeight: 600, marginTop: '0.2rem' }}>
                          ✓ Allows {info.targetQuota} Authorized Station{info.targetQuota > 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Payment Provision */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328', display: 'block', marginBottom: '0.5rem' }}>
                  2. Payment & Activation Method
                </label>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentTab('card')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: paymentTab === 'card' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      backgroundColor: paymentTab === 'card' ? '#f0fdfa' : '#ffffff',
                      color: paymentTab === 'card' ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab('po')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: paymentTab === 'po' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      backgroundColor: paymentTab === 'po' ? '#f0fdfa' : '#ffffff',
                      color: paymentTab === 'po' ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <Building className="w-4 h-4" />
                    <span>Hospital PO / Wire</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab('voucher')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: paymentTab === 'voucher' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      backgroundColor: paymentTab === 'voucher' ? '#f0fdfa' : '#ffffff',
                      color: paymentTab === 'voucher' ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <Key className="w-4 h-4" />
                    <span>Activation Key</span>
                  </button>
                </div>

                {/* Tab 1: Credit Card Form */}
                {paymentTab === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Card Number
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="podoload-input"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          style={{ fontSize: '0.78rem', paddingLeft: '2rem' }}
                        />
                        <CreditCard className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '8px', top: '9px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          CVC / CVV
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Billing Zip / Postal
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="94103"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Cardholder / Medical Facility Name
                      </label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Dr. Specialist / Clinic Name"
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Hospital Purchase Order Form */}
                {paymentTab === 'po' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Purchase Order (PO) Reference Number
                      </label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="PO-2026-MED-XXXX"
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Facility Tax / Reg ID
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="VAT / Tax ID"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Accounts Payable Email
                        </label>
                        <input
                          type="email"
                          className="podoload-input"
                          value={billingEmail}
                          onChange={(e) => setBillingEmail(e.target.value)}
                          placeholder="finance@hospital.com"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Activation Voucher Key */}
                {paymentTab === 'voucher' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Enter 16-Character License Activation Key
                      </label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={voucherKey}
                        onChange={(e) => setVoucherKey(e.target.value.toUpperCase())}
                        placeholder="e.g. PODO-DEV2-MULTI-2026"
                        style={{ fontSize: '0.82rem', fontFamily: 'monospace', letterSpacing: '1px' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      💡 Demo Activation Keys: <code>PODO-DEV2-MULTI-2026</code> (Dual-Station), <code>PODO-HOSPITAL-5DEV-2026</code> (5 Stations), <code>PODO-ENTERPRISE-UNLIMITED-2026</code> (Unlimited).
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary & Security Guarantee */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    Order Total: {paymentTab === 'voucher' ? 'Complimentary via Voucher Key' : `$${totalAmount}.00 USD`}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Includes 256-Bit Hardware Cryptography & HIPAA/GDPR Medical Storage
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0f766e', fontSize: '0.72rem', fontWeight: 700 }}>
                  <Lock className="w-3.5 h-3.5" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              {paymentError && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.74rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!completedInvoice && !isProcessing && (
          <div className="podoload-modal-footer" style={{ justifyContent: 'space-between', padding: '0.9rem 1.25rem' }}>
            <button type="button" className="podoload-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="podoload-btn-primary"
              onClick={handleProcessPayment}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', fontSize: '0.82rem' }}
            >
              <Lock className="w-4 h-4" />
              <span>
                {paymentTab === 'voucher'
                  ? 'Redeem Key & Allocate Seat'
                  : `Authorize Payment ($${totalAmount}.00)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

