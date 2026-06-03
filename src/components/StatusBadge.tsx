const statusStyles: Record<string, string> = {
  paid: 'badge-paid',
  unpaid: 'badge-unpaid',
  overdue: 'badge-overdue',
  draft: 'badge-draft',
  cancelled: 'badge-cancelled',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusStyles[status] || 'badge-draft'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
