import { useEffect, useState, useRef } from 'react';
import { Save, Building, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import { useAiCredits } from '../hooks/useAiCredits';
import { useUserPlan } from '../hooks/useUserPlan';
import { useToast } from '../contexts/ToastContext';
import { TEMPLATES, rgbCss } from '../lib/templates';
import CurrencySelect from '../components/CurrencySelect';

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useBusinessProfile();
  const { balance: aiBalance } = useAiCredits();
  const { plan, refetch: refetchPlan } = useUserPlan();
  const { toast, confirm } = useToast();
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const redeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc('redeem_appsumo_code', { p_code: redeemCode.trim() });
    setRedeeming(false);
    if (error) { toast(error.message, 'error'); return; }
    if (data?.ok) {
      toast('Lifetime plan activated! 🎉', 'success');
      setRedeemCode('');
      refetchPlan();
    } else {
      toast(data?.error || 'Could not redeem code', 'error');
    }
  };
  const [activeTab, setActiveTab] = useState('business');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [business, setBusiness] = useState({
    profile_name: '', business_name: '', email: '', phone: '', address: '', white_label: false,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Which profile the Business Profile form is currently editing.
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [reminders, setReminders] = useState({
    reminder_enabled: false,
    late_fee_enabled: false,
    late_fee_percent: 0,
    late_fee_grace_days: 0,
  });

  const [payments, setPayments] = useState({
    paypal_me: '', stripe_payment_link: '', payment_instructions: '',
  });

  const [smtp, setSmtp] = useState({
    smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', smtp_from: '',
  });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ email: '', role: 'viewer' });

  const loadProfiles = async () => {
    if (!user) return;
    const { data } = await supabase.from('business_profiles').select('*').eq('user_id', user.id).order('created_at');
    setProfiles(data || []);
  };
  const loadTeam = async () => {
    if (!user) return;
    const { data } = await supabase.from('team_members').select('*').eq('owner_id', user.id).order('created_at');
    setTeam(data || []);
  };
  useEffect(() => { loadProfiles(); loadTeam(); }, [user]);

  const setDefaultProfile = async (pid: string) => {
    if (!user) return;
    await (supabase.from('business_profiles') as any).update({ is_default: false }).eq('user_id', user.id);
    await (supabase.from('business_profiles') as any).update({ is_default: true }).eq('id', pid);
    loadProfiles(); refetch();
  };
  // Load a profile row into the Business Profile form.
  const loadProfileIntoForm = (p: any) => {
    setBusiness({
      profile_name: p.profile_name || '',
      business_name: p.business_name || '',
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      white_label: p.white_label ?? false,
    });
    setLogoUrl(p.logo_url || null);
    setReminders({
      reminder_enabled: p.reminder_enabled ?? false,
      late_fee_enabled: p.late_fee_enabled ?? false,
      late_fee_percent: Number(p.late_fee_percent) || 0,
      late_fee_grace_days: Number(p.late_fee_grace_days) || 0,
    });
    setPayments({
      paypal_me: p.paypal_me || '',
      stripe_payment_link: p.stripe_payment_link || '',
      payment_instructions: p.payment_instructions || '',
    });
    setSmtp({
      smtp_host: p.smtp_host || '',
      smtp_port: Number(p.smtp_port) || 465,
      smtp_user: p.smtp_user || '',
      smtp_pass: p.smtp_pass || '',
      smtp_from: p.smtp_from || '',
    });
  };

  // Create a new blank profile in-app (no browser prompt) and open it for editing.
  // Business name is left empty so the form shows placeholders for the user to fill;
  // the label gets a friendly auto number just so the switcher pill is distinguishable.
  const addProfile = async () => {
    if (!user) return;
    const isFirst = profiles.length === 0;
    const label = `Business ${profiles.length + 1}`;
    const { data } = await (supabase.from('business_profiles') as any)
      .insert({ user_id: user.id, business_name: '', profile_name: label, is_default: isFirst })
      .select('*')
      .single();
    await loadProfiles();
    if (data) {
      setEditingProfileId(data.id);
      loadProfileIntoForm(data);
      setActiveTab('business');
    }
  };

  // Open an existing profile in the Business Profile form.
  const editProfile = (p: any) => {
    setEditingProfileId(p.id);
    loadProfileIntoForm(p);
    setActiveTab('business');
  };

  const deleteProfile = async (pid: string) => {
    if (!(await confirm('Delete this business profile?'))) return;
    await supabase.from('business_profiles').delete().eq('id', pid);
    if (editingProfileId === pid) setEditingProfileId(null);
    await loadProfiles();
    refetch();
  };
  const addMember = async () => {
    if (!user || !newMember.email.trim()) return;
    await (supabase.from('team_members') as any).insert({ owner_id: user.id, email: newMember.email.trim(), role: newMember.role });
    setNewMember({ email: '', role: 'viewer' });
    loadTeam();
  };
  const removeMember = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id);
    loadTeam();
  };

  const [defaults, setDefaults] = useState(() => {
    const saved = localStorage.getItem('iq-defaults');
    const base = { currency: 'USD', taxRate: 0, paymentTerms: 30, invoicePrefix: 'INV-', notes: '', template: 'classic' };
    return saved ? { ...base, ...JSON.parse(saved) } : base;
  });

  // Template selection persists immediately (no separate Save needed).
  const selectTemplate = (id: string) => {
    const next = { ...defaults, template: id };
    setDefaults(next);
    localStorage.setItem('iq-defaults', JSON.stringify(next));
    toast(`${id.charAt(0).toUpperCase() + id.slice(1)} template selected`, 'success');
  };

  // Once profiles load, default to editing the default profile (or the first one).
  useEffect(() => {
    if (profiles.length === 0) return;
    const target = editingProfileId
      ? profiles.find(p => p.id === editingProfileId)
      : (profiles.find(p => p.is_default) || profiles[0]);
    if (target) {
      if (!editingProfileId) setEditingProfileId(target.id);
      loadProfileIntoForm(target);
    }
  }, [profiles]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image file.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB.', 'error'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    // Per-profile folder so multiple profiles keep separate logos.
    const folder = `${user.id}/${editingProfileId || 'default'}`;
    const filePath = `${folder}/logo.${ext}`;

    // Remove old logo if exists (different extension)
    const { data: existing } = await supabase.storage.from('logos').list(folder);
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => `${folder}/${f.name}`));
    }

    const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
    if (error) { toast('Upload failed: ' + error.message, 'error'); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
    // Append cache-buster so browsers pick up new logo
    setLogoUrl(urlData.publicUrl + '?t=' + Date.now());
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    const folder = `${user.id}/${editingProfileId || 'default'}`;
    const { data: existing } = await supabase.storage.from('logos').list(folder);
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => `${folder}/${f.name}`));
    }
    setLogoUrl(null);
  };

  const handleSaveBusiness = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      profile_name: business.profile_name || business.business_name || null,
      business_name: business.business_name,
      email: business.email || null,
      phone: business.phone || null,
      address: business.address || null,
      white_label: business.white_label,
      logo_url: logoUrl || null,
      reminder_enabled: reminders.reminder_enabled,
      late_fee_enabled: reminders.late_fee_enabled,
      late_fee_percent: reminders.late_fee_percent,
      late_fee_grace_days: reminders.late_fee_grace_days,
      paypal_me: payments.paypal_me || null,
      stripe_payment_link: payments.stripe_payment_link || null,
      payment_instructions: payments.payment_instructions || null,
      smtp_host: smtp.smtp_host || null,
      smtp_port: smtp.smtp_host ? smtp.smtp_port : null,
      smtp_user: smtp.smtp_user || null,
      smtp_pass: smtp.smtp_pass || null,
      smtp_from: smtp.smtp_from || null,
      updated_at: new Date().toISOString(),
    };

    const targetId = editingProfileId || profile?.id;
    if (targetId) {
      await (supabase.from('business_profiles') as any).update(payload).eq('id', targetId);
    } else {
      // First-ever profile.
      const { data } = await (supabase.from('business_profiles') as any).insert({ ...payload, is_default: true }).select('id').single();
      if (data) setEditingProfileId(data.id);
    }

    setSaving(false);
    setSaved(true);
    await loadProfiles();
    refetch();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('iq-defaults', JSON.stringify(defaults));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'business', label: 'Business Profile' },
    { id: 'defaults', label: 'Invoice Defaults' },
    { id: 'payments', label: 'Payments' },
    { id: 'reminders', label: 'Reminders & Late Fees' },
    { id: 'smtp', label: 'Custom SMTP' },
    { id: 'team', label: 'Team' },
    { id: 'plan', label: 'Plan' },
    { id: 'ai', label: 'AI Credits' },
    { id: 'templates', label: 'Templates' },
  ];

  if (profileLoading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        {saved && <span className="badge badge-paid">Saved!</span>}
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="card">
          {/* Profile switcher — pick which business to edit, or add another */}
          {profiles.length > 0 && (
            <div className="profile-switcher" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              {profiles.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => editProfile(p)}
                  className={`btn btn-sm ${editingProfileId === p.id ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p.profile_name || p.business_name}
                  {p.is_default && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>★</span>}
                </button>
              ))}
              <button type="button" onClick={addProfile} className="btn btn-sm btn-ghost"><Building size={14} /> Add Business</button>
            </div>
          )}

          <div className="card-header-row">
            <h3>{business.profile_name || business.business_name || 'Business Profile'}</h3>
            {editingProfileId && !profiles.find(p => p.id === editingProfileId)?.is_default && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setDefaultProfile(editingProfileId)} className="btn btn-sm btn-ghost">Set Default</button>
                <button type="button" onClick={() => deleteProfile(editingProfileId)} className="btn-icon danger" title="Delete profile"><Trash2 size={16} /></button>
              </div>
            )}
          </div>

          {/* Logo Upload */}
          <div className="form-group">
            <label>Business Logo</label>
            <div className="logo-upload-area">
              {logoUrl ? (
                <div className="logo-preview-wrapper">
                  <img src={logoUrl} alt="Logo" className="logo-preview" />
                  <button type="button" onClick={handleRemoveLogo} className="btn btn-sm btn-ghost danger-text">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div
                  className="logo-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} />
                  <span>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                  <span className="text-sm text-secondary">PNG, JPG up to 2MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              {logoUrl && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-sm btn-ghost mt-2">
                  <Upload size={14} /> Change Logo
                </button>
              )}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Profile Label</label>
              <input type="text" value={business.profile_name} onChange={e => setBusiness({ ...business, profile_name: e.target.value })} placeholder="e.g. Main Business (internal name)" />
            </div>
            <div className="form-group">
              <label>Business Name *</label>
              <input type="text" value={business.business_name} onChange={e => setBusiness({ ...business, business_name: e.target.value })} placeholder="Your Business Name" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} placeholder="billing@company.com" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} placeholder="+1 234 567 890" />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} rows={3} placeholder="Business address..." />
          </div>
          <div className="form-group">
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={business.white_label} onChange={e => setBusiness({ ...business, white_label: e.target.checked })} />
              White-label — remove "Sent via InvoiceQueen" from emails &amp; portal
            </label>
          </div>
          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'defaults' && (
        <div className="card">
          <h3>Invoice Defaults</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Currency</label>
              <CurrencySelect value={defaults.currency} onChange={v => setDefaults({ ...defaults, currency: v })} />
            </div>
            <div className="form-group">
              <label>Default Tax Rate (%)</label>
              <input type="number" value={defaults.taxRate} onChange={e => setDefaults({ ...defaults, taxRate: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
            </div>
            <div className="form-group">
              <label>Payment Terms (days)</label>
              <input type="number" value={defaults.paymentTerms} onChange={e => setDefaults({ ...defaults, paymentTerms: parseInt(e.target.value) || 30 })} min="0" />
            </div>
            <div className="form-group">
              <label>Invoice Prefix</label>
              <input type="text" value={defaults.invoicePrefix} onChange={e => setDefaults({ ...defaults, invoicePrefix: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Default Notes</label>
            <textarea value={defaults.notes} onChange={e => setDefaults({ ...defaults, notes: e.target.value })} rows={3} placeholder="Default invoice notes..." />
          </div>
          <div className="form-actions">
            <button onClick={handleSaveDefaults} className="btn btn-primary"><Save size={18} /> Save Defaults</button>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <h3>Accept Payments</h3>
          <p className="text-sm text-secondary">
            Connect your own payment accounts. Payments go directly to you — InvoiceQueen never touches the funds.
            These links appear on invoices you send and on the client portal.
          </p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>PayPal.me Username</label>
            <input
              type="text"
              value={payments.paypal_me}
              onChange={e => setPayments({ ...payments, paypal_me: e.target.value })}
              placeholder="e.g. kingasad (from paypal.me/kingasad)"
            />
            <span className="text-sm text-secondary">The invoice amount is added automatically.</span>
          </div>

          <div className="form-group">
            <label>Stripe</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <button type="button" disabled className="btn btn-primary" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                Connect with Stripe
              </button>
              <span className="badge badge-unpaid">Coming Soon</span>
            </div>
            <span className="text-sm text-secondary">
              One-click Stripe Connect — clients pay each invoice's exact amount and it's marked paid automatically. Launching soon.
            </span>
          </div>

          <div className="form-group">
            <label>Other Payment Instructions</label>
            <textarea
              value={payments.payment_instructions}
              onChange={e => setPayments({ ...payments, payment_instructions: e.target.value })}
              rows={3}
              placeholder="Bank transfer details, IBAN, or other instructions shown on invoices..."
            />
          </div>

          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </div>
          {!business.business_name && (
            <p className="text-sm text-secondary">Set up your Business Profile first.</p>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="card">
          <h3>Automated Reminders & Late Fees</h3>
          <p className="text-sm text-secondary">
            Reminders are emailed daily to clients with overdue invoices (max once every 3 days per invoice).
          </p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={reminders.reminder_enabled}
                onChange={e => setReminders({ ...reminders, reminder_enabled: e.target.checked })}
              />
              Send automatic payment reminders for overdue invoices
            </label>
          </div>

          <div className="form-group">
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={reminders.late_fee_enabled}
                onChange={e => setReminders({ ...reminders, late_fee_enabled: e.target.checked })}
              />
              Apply late fees to overdue invoices
            </label>
          </div>

          {reminders.late_fee_enabled && (
            <div className="form-grid-2">
              <div className="form-group">
                <label>Late Fee (% of invoice total)</label>
                <input
                  type="number"
                  value={reminders.late_fee_percent}
                  onChange={e => setReminders({ ...reminders, late_fee_percent: parseFloat(e.target.value) || 0 })}
                  min="0" step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Grace Period (days after due date)</label>
                <input
                  type="number"
                  value={reminders.late_fee_grace_days}
                  onChange={e => setReminders({ ...reminders, late_fee_grace_days: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          {!business.business_name && (
            <p className="text-sm text-secondary">Set up your Business Profile first to enable these settings.</p>
          )}
        </div>
      )}

      {activeTab === 'smtp' && (
        <div className="card">
          <h3>Custom SMTP</h3>
          <p className="text-sm text-secondary">
            Send invoice &amp; reminder emails from your own mail server. Leave blank to use InvoiceQueen's default sending.
          </p>
          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group"><label>SMTP Host</label><input type="text" value={smtp.smtp_host} onChange={e => setSmtp({ ...smtp, smtp_host: e.target.value })} placeholder="smtp.yourmail.com" /></div>
            <div className="form-group"><label>Port</label><input type="number" value={smtp.smtp_port} onChange={e => setSmtp({ ...smtp, smtp_port: parseInt(e.target.value) || 465 })} placeholder="465" /></div>
            <div className="form-group"><label>Username</label><input type="text" value={smtp.smtp_user} onChange={e => setSmtp({ ...smtp, smtp_user: e.target.value })} /></div>
            <div className="form-group"><label>Password</label><input type="password" value={smtp.smtp_pass} onChange={e => setSmtp({ ...smtp, smtp_pass: e.target.value })} /></div>
          </div>
          <div className="form-group">
            <label>From address</label>
            <input type="text" value={smtp.smtp_from} onChange={e => setSmtp({ ...smtp, smtp_from: e.target.value })} placeholder="Your Business <billing@yourmail.com>" />
          </div>
          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save SMTP'}
            </button>
          </div>
          <p className="text-sm text-secondary">Port 465 = SSL/TLS (recommended). Tip: use an app-specific password.</p>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card">
          <h3>Team Members</h3>
          <p className="text-sm text-secondary">
            Add teammates and assign roles. Note: shared login access for members is being rolled out —
            roles are recorded here now and will activate when member access goes live.
          </p>
          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <input type="email" placeholder="teammate@email.com" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
            <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={addMember} className="btn btn-primary" disabled={!newMember.email.trim()}>Add</button>
          </div>
          <table className="table" style={{ marginTop: 16 }}>
            <thead><tr><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {team.map(m => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td><span className="badge badge-unpaid">{m.role}</span></td>
                  <td><button onClick={() => removeMember(m.id)} className="btn-icon danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="card">
          <h3>Your Plan</h3>
          <div className="totals-section" style={{ marginTop: 12 }}>
            <div className="total-row total-final">
              <span>Current plan</span>
              <span>
                {plan?.plan === 'lifetime'
                  ? <span className="badge badge-paid">Lifetime ✓</span>
                  : <span className="badge badge-unpaid">Free</span>}
              </span>
            </div>
            {plan?.plan === 'lifetime' && (
              <div className="total-row"><span>AI credits / month</span><span>{plan.monthly_ai_credits}</span></div>
            )}
          </div>

          {plan?.plan !== 'lifetime' && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <h3>Redeem AppSumo Code</h3>
              <p className="text-sm text-secondary">Got a code from AppSumo? Enter it to unlock lifetime access.</p>
              <div className="flex gap-2" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="IQ-XXXXXXXXXX"
                  style={{ fontFamily: 'monospace', letterSpacing: 1 }}
                />
                <button onClick={redeem} disabled={redeeming || !redeemCode.trim()} className="btn btn-primary">
                  {redeeming ? 'Redeeming...' : 'Redeem'}
                </button>
              </div>
            </div>
          )}

          {plan?.plan === 'lifetime' && (
            <p className="text-sm text-secondary" style={{ marginTop: 16 }}>
              🎉 You have lifetime access — unlimited invoices, clients, businesses, white-label, custom SMTP, and {plan.monthly_ai_credits} AI credits every month.
            </p>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="card">
          <h3>AI Credits</h3>
          <p className="text-sm text-secondary">
            AI features (invoice writer, smart due dates, reminder drafting) use credits. 1 credit = 1 AI action.
          </p>
          <div className="totals-section" style={{ marginTop: 16 }}>
            <div className="total-row total-final">
              <span>Current balance</span>
              <span>{aiBalance === null ? '…' : `${aiBalance} credits`}</span>
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={() => toast('Credit purchase checkout coming soon. For now, credits can be granted from the admin dashboard.', 'info')}
            >
              Buy Credits
            </button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="card">
          <h3>Invoice Templates</h3>
          <p className="text-sm text-secondary">Pick a style — it applies to your invoice PDFs and the client portal.</p>
          <div className="templates-grid" style={{ marginTop: 16 }}>
            {TEMPLATES.map(tpl => {
              const selected = (defaults.template || 'classic') === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={`template-card ${selected ? 'selected' : ''}`}
                  onClick={() => selectTemplate(tpl.id)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {selected && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--primary)', color: '#fff', borderRadius: 100, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✓</span>
                  )}
                  {/* Mini invoice preview reflecting the template's style */}
                  <div className="template-preview" style={{ background: '#fff', border: '1px solid var(--border)', padding: 10, display: 'block' }}>
                    <div style={{ height: 14, width: '55%', background: rgbCss(tpl.accent), borderRadius: 2, marginBottom: 8 }} />
                    <div style={{ height: 6, background: tpl.tableTheme === 'plain' ? '#e2e8f0' : rgbCss(tpl.accent), opacity: tpl.tableTheme === 'plain' ? 1 : 0.85, marginBottom: 4, borderRadius: 1 }} />
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ height: 5, background: tpl.tableTheme === 'striped' && i % 2 ? '#f1f5f9' : '#eef2f7', marginBottom: 3, borderRadius: 1, borderBottom: tpl.tableTheme === 'grid' ? '1px solid #e2e8f0' : 'none' }} />
                    ))}
                    <div style={{ marginTop: 8, marginLeft: 'auto', height: 9, width: '40%', background: tpl.filledTotal ? rgbCss(tpl.accent) : 'transparent', borderBottom: tpl.filledTotal ? 'none' : `2px solid ${rgbCss(tpl.accent)}`, borderRadius: 2 }} />
                  </div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className="text-sm text-secondary">{tpl.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
