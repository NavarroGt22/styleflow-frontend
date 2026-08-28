import { useParams } from 'react-router-dom';
import { isAdminPrototypeEnabled, isAdminPrototypeSlug } from '../config/admin-prototype';
import AdminPrototype from './AdminPrototype';
import Dashboard from './Dashboard';

export default function AdminRoute() {
  const { salonSlug } = useParams();

  if (salonSlug && isAdminPrototypeEnabled() && isAdminPrototypeSlug(salonSlug)) {
    return <AdminPrototype />;
  }

  return <Dashboard />;
}
