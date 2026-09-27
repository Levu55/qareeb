import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatPKR, cn } from '../../lib/utils';
import { Users, Briefcase, AlertTriangle, Wallet, CheckCircle, XCircle, UserCheck, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabaseClient';

export function AdminDashboard() {
  const role = useAppStore(state => state.role);
  
  const stats = [
    { name: 'Active Users', value: '1,204', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Jobs in Progress', value: '45', icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Unresolved Disputes', value: '3', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { name: "Today's Revenue", value: formatPKR(25400), icon: Wallet, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back, {role === 'superadmin' ? 'Founder' : 'Admin'}</p>
        </div>
        {role === 'superadmin' && (
          <Button variant="danger" className="h-10 text-sm bg-red-600 hover:bg-red-700">
             Emergency Lockdown
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center p-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center me-4", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="col-span-2 p-6 h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Live Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-orange-light text-brand-orange rounded-full flex items-center justify-center font-bold me-4">
                    {i === 1 || i === 3 ? 'J' : 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {i === 1 ? 'Job #4592 Completed' : i === 2 ? 'New User Registered' : i === 3 ? 'Helper Accepted Job' : 'Payment Disputed'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">2 minutes ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Required */}
        <Card className="col-span-1 p-6 h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Action Required</h2>
          <div className="space-y-3">
             <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start">
               <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 me-3 flex-shrink-0" />
               <div>
                 <p className="font-semibold text-orange-900 text-sm">CNIC Verification</p>
                 <p className="text-xs text-orange-700 mt-1">12 helpers waiting for identity verification.</p>
                 <a href="/admin/cnic" className="inline-block mt-2 text-xs font-bold text-brand-orange hover:underline">Review Now →</a>
               </div>
             </div>
             
             <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start">
               <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 me-3 flex-shrink-0" />
               <div>
                 <p className="font-semibold text-red-900 text-sm">Active Disputes</p>
                 <p className="text-xs text-red-700 mt-1">3 jobs currently disputed by users.</p>
                 <a href="/admin/disputes" className="inline-block mt-2 text-xs font-bold text-red-600 hover:underline">Resolve Now →</a>
               </div>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function UserManagementScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'helpers'>('users');

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">User & Helper Management</h1>
          <p className="text-gray-500">Manage platform users, view their status, and take administrative actions.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('users')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${activeTab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <Users className="w-4 h-4 me-2" /> Users
           </button>
           <button 
             onClick={() => setActiveTab('helpers')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${activeTab === 'helpers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <UserCheck className="w-4 h-4 me-2" /> Helpers
           </button>
        </div>
      </div>

      <Card className="flex-1 overflow-auto rounded-2xl p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-sm font-semibold text-gray-600">ID</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Contact</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Join Date</th>
              {activeTab === 'helpers' && <th className="p-4 text-sm font-semibold text-gray-600">Rating</th>}
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((item) => (
              <tr key={item} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="p-4 font-mono text-sm">#{activeTab === 'users' ? 'USR' : 'HLP'}-{9000 + item}</td>
                <td className="p-4 font-medium flex items-center gap-3">
                  <img src={`https://ui-avatars.com/api/?name=User+${item}&background=f3f4f6`} className="w-8 h-8 rounded-full" />
                  {activeTab === 'users' ? 'Ahmed Khan' : 'Kamran Ali'}
                </td>
                <td className="p-4 text-gray-600">0300 123456{item}</td>
                <td className="p-4 text-gray-600">Aug {item}, 2026</td>
                {activeTab === 'helpers' && <td className="p-4 font-medium flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current me-1" /> 4.{9 - item}</td>}
                <td className="p-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>
                </td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" className="h-8 px-2">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

interface CnicSubmission {
  userId: string;
  name: string;
  phone: string;
  role: string;
  submittedAt: string | null;
  previouslyRejected: boolean;
  reviewedAt?: string | null;
  isSelf: boolean;
  documents: { front: string | null; back: string | null; selfie: string | null };
}

async function callReviewCnic(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('review-cnic', { body });
  if (error) {
    // Surface the function's own error message when available
    const message = await (error as any).context?.json?.().then((j: any) => j?.error).catch(() => null);
    throw new Error(message || error.message || 'Review service unavailable.');
  }
  return data;
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Submission time unknown';
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'Submitted just now';
  if (minutes < 60) return `Submitted ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Submitted ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `Submitted ${days} day${days === 1 ? '' : 's'} ago`;
}

function roleLabel(role: string) {
  if (role === 'helper') return 'Helper';
  if (role === 'admin') return 'Admin';
  if (role === 'superadmin') return 'Super Admin';
  return 'Customer';
}

function DocumentImage({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  if (!url) {
    return <span className="text-sm text-gray-400">Not provided</span>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
      <img src={url} alt={alt} className={cn('w-full h-full object-contain bg-white', className)} />
    </a>
  );
}

export function AdminCNICQueue() {
  const addToast = useAppStore(state => state.addToast);
  const [submissions, setSubmissions] = useState<CnicSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approved, setApproved] = useState<CnicSubmission[]>([]);
  const [revoking, setRevoking] = useState(false);

  const loadQueue = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await callReviewCnic({ action: 'list' });
      const list: CnicSubmission[] = data?.submissions ?? [];
      const approvedList: CnicSubmission[] = data?.approved ?? [];
      setSubmissions(list);
      setApproved(approvedList);
      setSelectedId(current =>
        current && (list.some(s => s.userId === current) || approvedList.some(s => s.userId === current))
          ? current
          : list[0]?.userId ?? null
      );
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load the review queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const selectedApproved = approved.find(s => s.userId === selectedId) || null;
  const selected = submissions.find(s => s.userId === selectedId) || selectedApproved;

  const selectSubmission = (userId: string) => {
    setSelectedId(userId);
    setRejecting(false);
    setRevoking(false);
    setRejectReason('');
  };

  const handleRevoke = async () => {
    if (!selectedApproved || !rejectReason.trim()) return;
    setIsReviewing(true);
    try {
      await callReviewCnic({ action: 'revoke', userId: selectedApproved.userId, note: rejectReason.trim() });
      addToast(`Approval revoked for ${selectedApproved.name || 'applicant'}. It is back in the review queue.`, 'info');
      setRevoking(false);
      setRejectReason('');
      await loadQueue();
    } catch (err: any) {
      addToast(err?.message || 'Revoke failed.', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!selected) return;
    const note = decision === 'rejected' ? rejectReason.trim() : undefined;
    if (decision === 'rejected' && !note) return;
    setIsReviewing(true);
    try {
      await callReviewCnic({ action: 'review', userId: selected.userId, decision, note });
      addToast(
        decision === 'approved' ? `CNIC approved for ${selected.name || 'applicant'}.` : `CNIC rejected for ${selected.name || 'applicant'}.`,
        decision === 'approved' ? 'success' : 'info'
      );
      setRejecting(false);
      setRejectReason('');
      await loadQueue();
    } catch (err: any) {
      addToast(err?.message || 'Review failed.', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="h-full max-w-6xl mx-auto flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CNIC Verification Queue</h1>
        <p className="text-gray-500 mt-1">Review helper identity documents carefully.</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        {/* Queue List */}
        <Card className="col-span-1 p-0 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700 flex items-center justify-between">
            <span>Pending Review ({isLoading ? '…' : submissions.length})</span>
            <button onClick={loadQueue} disabled={isLoading} className="text-sm font-medium text-brand-orange hover:underline disabled:opacity-50">
              Refresh
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
             {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
             {!isLoading && !loadError && submissions.length === 0 && (
               <p className="p-4 text-sm text-gray-500">No submissions are waiting for review.</p>
             )}
             {submissions.map((item) => (
               <div
                 key={item.userId}
                 onClick={() => selectSubmission(item.userId)}
                 className={cn(
                   "p-4 border-b border-gray-100 cursor-pointer transition-colors",
                   selectedId === item.userId ? "bg-brand-orange-light border-l-4 border-brand-orange border-l-brand-orange" : "hover:bg-gray-50"
                 )}
               >
                 <p className="font-semibold text-gray-900">{item.name || 'Unnamed applicant'}{item.isSelf ? ' (you)' : ''}</p>
                 <p className="text-sm text-gray-500 mt-1">
                   {roleLabel(item.role)} • {timeAgo(item.submittedAt)}{item.previouslyRejected ? ' • resubmitted' : ''}
                 </p>
               </div>
             ))}
             {approved.length > 0 && (
               <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700 text-sm">Approved ({approved.length})</div>
             )}
             {approved.map((item) => (
               <div
                 key={item.userId}
                 onClick={() => selectSubmission(item.userId)}
                 className={cn(
                   "p-4 border-b border-gray-100 cursor-pointer transition-colors",
                   selectedId === item.userId ? "bg-brand-orange-light border-l-4 border-brand-orange border-l-brand-orange" : "hover:bg-gray-50"
                 )}
               >
                 <p className="font-semibold text-gray-900">{item.name || 'Unnamed applicant'}{item.isSelf ? ' (you)' : ''}</p>
                 <p className="text-sm text-gray-500 mt-1">{roleLabel(item.role)} • Approved</p>
               </div>
             ))}
          </div>
        </Card>

        {/* Review Detail */}
        {selected ? (
          <Card className="col-span-2 p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name || 'Unnamed applicant'}</h2>
                <p className="text-gray-500">
                  {roleLabel(selected.role)} • Phone: {selected.phone || 'unknown'}
                </p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                {selectedApproved ? 'Approved' : selected.previouslyRejected ? 'Resubmitted' : 'Pending Review'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">CNIC Front</p>
                <div className="bg-gray-100 rounded-2xl h-48 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                   <DocumentImage url={selected.documents.front} alt="CNIC Front" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">CNIC Back</p>
                <div className="bg-gray-100 rounded-2xl h-48 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                   <DocumentImage url={selected.documents.back} alt="CNIC Back" />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-2">Live Selfie Match</p>
              <div className="flex items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                 <div className="w-16 h-16 rounded-full overflow-hidden me-4 border-2 border-gray-300 flex items-center justify-center bg-white shrink-0">
                    <DocumentImage url={selected.documents.selfie} alt="Selfie" className="object-cover" />
                 </div>
                 <div>
                   <p className="font-semibold text-gray-900">Manual check required</p>
                   <p className="text-sm text-gray-600">
                     Compare the selfie with the CNIC photo and check the card is a genuine, readable Pakistani CNIC. Click an image to open it full size.
                   </p>
                 </div>
              </div>
            </div>

            {selected.isSelf && (
              <p className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-xl">This is your own submission, so Approve and Reject are disabled. Another admin must review it.</p>
            )}

            {selectedApproved ? (
              revoking ? (
                <div className="mt-auto border-t border-gray-100 pt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for revoking this approval</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={500}
                    rows={3}
                    autoFocus
                    placeholder="e.g. Approved by mistake, document needs re-checking"
                    className="w-full rounded-2xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <p className="text-xs text-gray-500 mt-2">The submission returns to the pending queue, where it can be approved or rejected again.</p>
                  <div className="flex justify-end space-x-4 mt-4">
                    <Button variant="outline" className="w-32" disabled={isReviewing} onClick={() => { setRevoking(false); setRejectReason(''); }}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      className="w-48 bg-red-600 text-white hover:bg-red-700"
                      disabled={isReviewing || !rejectReason.trim()}
                      isLoading={isReviewing}
                      onClick={handleRevoke}
                    >
                      Confirm Revoke
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex justify-end space-x-4 border-t border-gray-100 pt-6">
                  <Button
                    variant="danger"
                    className="w-48 bg-white text-red-600 border-2 border-red-200 hover:bg-red-50"
                    disabled={isReviewing || selected.isSelf}
                    onClick={() => setRevoking(true)}
                  >
                    Revoke Approval
                  </Button>
                </div>
              )
            ) : rejecting ? (
              <div className="mt-auto border-t border-gray-100 pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  autoFocus
                  placeholder="e.g. Photo is not a CNIC, text is unreadable, selfie does not match"
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="flex justify-end space-x-4 mt-4">
                  <Button variant="outline" className="w-32" disabled={isReviewing} onClick={() => { setRejecting(false); setRejectReason(''); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="w-44 bg-red-600 text-white hover:bg-red-700"
                    disabled={isReviewing || !rejectReason.trim()}
                    isLoading={isReviewing}
                    onClick={() => handleReview('rejected')}
                  >
                    Confirm Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-auto flex justify-end space-x-4 border-t border-gray-100 pt-6">
                 <Button
                   variant="danger"
                   className="w-32 bg-white text-red-600 border-2 border-red-200 hover:bg-red-50"
                   disabled={isReviewing || selected.isSelf}
                   onClick={() => setRejecting(true)}
                 >
                   Reject
                 </Button>
                 <Button
                   className="w-40 bg-brand-orange hover:bg-brand-orange-hover"
                   disabled={isReviewing || selected.isSelf || !selected.documents.front}
                   isLoading={isReviewing}
                   onClick={() => handleReview('approved')}
                 >
                   <CheckCircle className="w-5 h-5 me-2" /> Approve
                 </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="col-span-2 flex items-center justify-center text-gray-400">
            {isLoading ? 'Loading submissions…' : 'Select an application to review'}
          </div>
        )}
      </div>
    </div>
  );
}
