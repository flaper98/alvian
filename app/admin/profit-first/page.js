import { redirect } from 'next/navigation';

// El antiguo "Reparto" fue reemplazado por la Distribución de ganancias.
// Las salidas que se anotaron aquí se siguen contando en la Caja y en la Reserva.
export default function ProfitFirstPage() {
  redirect('/admin/distribucion');
}
