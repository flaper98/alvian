import { getCurrentRole } from '@/lib/session';
import { getProfitFirst, listPfOutflows, listPfPlans, periodRange, PERIODS } from '@/lib/db';
import ProfitFirstView from './ProfitFirstView';

export const dynamic = 'force-dynamic';

export default async function ProfitFirstPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const { periodo } = await searchParams;
  const period = PERIODS[periodo] ? periodo : 'mes';

  let data;
  let outflows;
  let plans;
  try {
    [data, outflows, plans] = await Promise.all([
      getProfitFirst({ period }),
      listPfOutflows(periodRange(period)),
      listPfPlans(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Reparto</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <ProfitFirstView
      period={period}
      data={data}
      outflows={outflows}
      currentPercents={plans[plans.length - 1].percents}
    />
  );
}
