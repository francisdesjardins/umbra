// Namespace components for composition
export { Content } from '@/entities/modal-template/ui/mui/form-modal/components/Content';
// Namespace components for composition
export { FieldError } from '@/entities/modal-template/ui/mui/form-modal/components/FieldError';
export { Footer } from '@/entities/modal-template/ui/mui/form-modal/components/Footer';
export {
  FormLayout as DefaultLayout,
  FormLayout,
} from '@/entities/modal-template/ui/mui/form-modal/components/FormLayout';
export { Header } from '@/entities/modal-template/ui/mui/form-modal/components/Header';

// Namespace object for convenient access: FormModal.FormLayout, etc.
import { Content } from '@/entities/modal-template/ui/mui/form-modal/components/Content';
import { FieldError } from '@/entities/modal-template/ui/mui/form-modal/components/FieldError';
import { Footer } from '@/entities/modal-template/ui/mui/form-modal/components/Footer';
import { FormLayout } from '@/entities/modal-template/ui/mui/form-modal/components/FormLayout';
import { Header } from '@/entities/modal-template/ui/mui/form-modal/components/Header';

export const FormModal = {
  DefaultLayout: FormLayout,
  FormLayout,
  FieldError,
  Header,
  Content,
  Footer,
} as const;
