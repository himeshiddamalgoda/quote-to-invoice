import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/health.api';
import { getErrorMessage } from '../api/http';
export default function OverviewPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  return (
    <>
      <p className="eyebrow">BUSINESS WORKFLOW</p>
      <h1>From proposal to agreement.</h1>
      <p className="lead">
        A clear foundation for managing customers, quotations, approvals, and proforma invoices.
      </p>
      <section className="panel">
        <h2>Application foundation</h2>
        <p>
          The application infrastructure is ready. Business screens will be introduced feature by
          feature.
        </p>
        <p role="status">
          {health.isPending
            ? 'Connecting to the API…'
            : health.isError
              ? getErrorMessage(health.error)
              : 'API is available.'}
        </p>
      </section>
      <section>
        <h2>The quotation journey</h2>
        <ol className="workflow">
          {[
            'Customer',
            'Quotation draft',
            'Manager approval',
            'Customer acceptance',
            'Proforma invoice',
          ].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
