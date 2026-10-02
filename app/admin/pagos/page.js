import { redirect } from 'next/navigation';

// El resumen de pagos ahora vive en la Caja.
export default function PagosPage() {
  redirect('/admin/caja');
}
